const express = require('express');
const router = express.Router();
const { query, getClient } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { asyncHandler, notFound } = require('../middleware/errorHandler');

// POST /api/payments
router.post('/', authenticate, asyncHandler(async (req, res) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const { order_id, payments: paymentList } = req.body;
    // paymentList: [{method, amount, transaction_id, payment_gateway}]

    const orderResult = await client.query(
      `SELECT * FROM orders WHERE id = $1 AND is_paid = false`, [order_id]
    );
    if (orderResult.rows.length === 0) {
      throw { message: 'Order not found or already paid', statusCode: 400 };
    }

    const order = orderResult.rows[0];
    const totalPaid = paymentList.reduce((sum, p) => sum + parseFloat(p.amount), 0);

    if (totalPaid < parseFloat(order.total_amount)) {
      throw { message: 'Payment amount is less than order total', statusCode: 400 };
    }

    const savedPayments = [];
    for (const p of paymentList) {
      const result = await client.query(
        `INSERT INTO payments (order_id, payment_method, amount, transaction_id, status, payment_gateway, processed_by)
         VALUES ($1, $2, $3, $4, 'success', $5, $6) RETURNING *`,
        [order_id, p.method, p.amount, p.transaction_id || null, p.payment_gateway || null, req.user.id]
      );
      savedPayments.push(result.rows[0]);
    }

    // Determine primary payment method
    const primaryMethod = paymentList.length > 1 ? 'mixed' : paymentList[0].method;

    await client.query(
      `UPDATE orders SET is_paid = true, payment_method = $1, status = 'completed',
       completed_at = NOW(), updated_at = NOW() WHERE id = $2`,
      [primaryMethod, order_id]
    );

    // Generate receipt number
    const receiptNum = `RCP-${Date.now()}`;
    const receiptContent = {
      order,
      payments: savedPayments,
      change: totalPaid - parseFloat(order.total_amount)
    };
    await client.query(
      `INSERT INTO receipts (order_id, receipt_number, receipt_content)
       VALUES ($1, $2, $3)`,
      [order_id, receiptNum, JSON.stringify(receiptContent)]
    );

    // Update shift totals
    await client.query(
      `UPDATE shifts SET total_sales = total_sales + $1,
       total_cash = total_cash + $2, updated_at = NOW()
       WHERE user_id = $3 AND status = 'open' AND location_id = $4`,
      [order.total_amount,
       paymentList.filter(p => p.method === 'cash').reduce((s, p) => s + parseFloat(p.amount), 0),
       req.user.id, order.location_id]
    );

    await client.query('COMMIT');
    res.status(201).json({ payments: savedPayments, receipt_number: receiptNum, change: totalPaid - parseFloat(order.total_amount) });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}));

// GET /api/payments/order/:orderId
router.get('/order/:orderId', authenticate, asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT p.*, u.first_name || ' ' || u.last_name as processed_by_name
     FROM payments p JOIN users u ON p.processed_by = u.id
     WHERE p.order_id = $1`,
    [req.params.orderId]
  );
  res.json(result.rows);
}));

module.exports = router;
