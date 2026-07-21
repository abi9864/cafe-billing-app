const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Razorpay = require('razorpay');
const { query, getClient } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { deductRecipeInventory, checkLowStockAfterDeduction } = require('../utils/recipeDeduction');

// Fail loudly in the logs if keys are missing, but don't crash the whole server —
// only requests that actually hit these routes should fail.
if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  console.warn('⚠️  RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET not set — online payments will fail. See backend/.env.example');
}

let razorpayClient = null;
const getRazorpay = () => {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw { message: 'Razorpay is not configured on this server (missing API keys)', statusCode: 503 };
  }
  if (!razorpayClient) {
    razorpayClient = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });
  }
  return razorpayClient;
};

// POST /api/razorpay/create-order
// Creates a Razorpay order for an existing unpaid cafe order and returns
// everything the frontend Checkout widget needs to launch.
router.post('/create-order', authenticate, asyncHandler(async (req, res) => {
  const { order_id } = req.body;
  if (!order_id) throw { message: 'order_id is required', statusCode: 400 };

  const orderResult = await query(
    `SELECT id, order_number, total_amount FROM orders WHERE id = $1 AND is_paid = false`,
    [order_id]
  );
  if (orderResult.rows.length === 0) {
    throw { message: 'Order not found or already paid', statusCode: 400 };
  }
  const order = orderResult.rows[0];

  // Razorpay expects the amount in paise (smallest currency unit for INR)
  const amountInPaise = Math.round(parseFloat(order.total_amount) * 100);

  const razorpayOrder = await getRazorpay().orders.create({
    amount: amountInPaise,
    currency: 'INR',
    receipt: order.order_number,
    notes: { cafe_order_id: order.id }
  });

  res.json({
    key_id: process.env.RAZORPAY_KEY_ID,
    razorpay_order_id: razorpayOrder.id,
    amount: razorpayOrder.amount,
    currency: razorpayOrder.currency,
    order_id: order.id,
    order_number: order.order_number
  });
}));

// POST /api/razorpay/verify
// Verifies the HMAC signature Razorpay Checkout returns on success, then
// records the payment the same way a manual payment would be recorded:
// marks the order paid, writes a receipt, and updates the active shift totals.
router.post('/verify', authenticate, asyncHandler(async (req, res) => {
  const { order_id, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  if (!order_id || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    throw { message: 'Missing Razorpay verification fields', statusCode: 400 };
  }

  if (!process.env.RAZORPAY_KEY_SECRET) {
    throw { message: 'Razorpay is not configured on this server (missing API keys)', statusCode: 503 };
  }

  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (expectedSignature !== razorpay_signature) {
    throw { message: 'Payment verification failed — signature mismatch', statusCode: 400 };
  }

  // Ask Razorpay which method the customer actually used (upi, card,
  // netbanking, wallet, emi) so reports can break these down separately
  // instead of lumping everything under a generic "mobile" bucket.
  let razorpayMethod = 'mobile';
  try {
    const paymentDetails = await getRazorpay().payments.fetch(razorpay_payment_id);
    if (paymentDetails?.method) razorpayMethod = paymentDetails.method;
  } catch (err) {
    console.warn('Could not fetch Razorpay payment method, defaulting to "mobile":', err.message);
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');

    const orderResult = await client.query(
      `SELECT * FROM orders WHERE id = $1 AND is_paid = false`, [order_id]
    );
    if (orderResult.rows.length === 0) {
      throw { message: 'Order not found or already paid', statusCode: 400 };
    }
    const order = orderResult.rows[0];

    const paymentResult = await client.query(
      `INSERT INTO payments (order_id, payment_method, amount, transaction_id, status, payment_gateway, processed_by)
       VALUES ($1, $2, $3, $4, 'success', 'razorpay', $5) RETURNING *`,
      [order_id, razorpayMethod, order.total_amount, razorpay_payment_id, req.user.id]
    );

    await client.query(
      `UPDATE orders SET is_paid = true, payment_method = $1, status = 'completed',
       completed_at = NOW(), updated_at = NOW() WHERE id = $2`,
      [razorpayMethod, order_id]
    );

    // The SELECT ... WHERE is_paid = false above guarantees this order
    // wasn't already completed, so it's always safe to deduct here.
    const touchedInventoryIds = await deductRecipeInventory(client, order_id, req.user.id);

    const receiptNum = `RCP-${Date.now()}`;
    const receiptContent = {
      order,
      payments: [paymentResult.rows[0]],
      change: 0
    };
    await client.query(
      `INSERT INTO receipts (order_id, receipt_number, receipt_content)
       VALUES ($1, $2, $3)`,
      [order_id, receiptNum, JSON.stringify(receiptContent)]
    );

    await client.query(
      `UPDATE shifts SET total_sales = total_sales + $1, updated_at = NOW()
       WHERE user_id = $2 AND status = 'open' AND location_id = $3`,
      [order.total_amount, req.user.id, order.location_id]
    );

    await client.query('COMMIT');
    checkLowStockAfterDeduction(query, touchedInventoryIds);
    res.status(201).json({
      payment: paymentResult.rows[0],
      receipt_number: receiptNum
    });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}));

module.exports = router;
