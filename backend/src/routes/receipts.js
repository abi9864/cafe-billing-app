const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { asyncHandler, notFound } = require('../middleware/errorHandler');

// GET /api/receipts/:id
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT r.*, o.order_number, o.total_amount, o.created_at as order_date,
            o.order_type, o.customer_name
     FROM receipts r JOIN orders o ON r.order_id = o.id
     WHERE r.id = $1`,
    [req.params.id]
  );
  if (result.rows.length === 0) throw notFound('Receipt not found');
  res.json(result.rows[0]);
}));

// GET /api/receipts/order/:orderId
router.get('/order/:orderId', authenticate, asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT r.*, o.order_number, o.total_amount, o.created_at as order_date
     FROM receipts r JOIN orders o ON r.order_id = o.id
     WHERE r.order_id = $1`,
    [req.params.orderId]
  );
  if (result.rows.length === 0) throw notFound('Receipt not found');
  res.json(result.rows[0]);
}));

// POST /api/receipts/:id/print
router.post('/:id/print', authenticate, asyncHandler(async (req, res) => {
  const result = await query(
    `UPDATE receipts SET printed_count = printed_count + 1, printed_at = NOW(), updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [req.params.id]
  );
  if (result.rows.length === 0) throw notFound('Receipt not found');
  res.json(result.rows[0]);
}));

module.exports = router;
