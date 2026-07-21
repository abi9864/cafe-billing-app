const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { asyncHandler, notFound } = require('../middleware/errorHandler');

// GET /api/loyalty/customers
router.get('/customers', authenticate, asyncHandler(async (req, res) => {
  const locId = req.query.location_id || req.user.location_id;
  const { search } = req.query;
  let sql = `SELECT * FROM loyalty_customers WHERE location_id = $1`;
  const params = [locId];
  if (search) { params.push(`%${search}%`); sql += ` AND (customer_name ILIKE $${params.length} OR phone_number ILIKE $${params.length})`; }
  sql += ' ORDER BY visit_count DESC';
  const result = await query(sql, params);
  res.json(result.rows);
}));

// GET /api/loyalty/customers/lookup/:phone
router.get('/customers/lookup/:phone', authenticate, asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT * FROM loyalty_customers WHERE phone_number = $1`, [req.params.phone]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: 'Customer not found' });
  res.json(result.rows[0]);
}));

// POST /api/loyalty/customers
router.post('/customers', authenticate, asyncHandler(async (req, res) => {
  const { location_id, phone_number, email, customer_name } = req.body;
  const locId = location_id || req.user.location_id;
  const result = await query(
    `INSERT INTO loyalty_customers (location_id, phone_number, email, customer_name)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [locId, phone_number, email || null, customer_name]
  );
  res.status(201).json(result.rows[0]);
}));

// POST /api/loyalty/earn
router.post('/earn', authenticate, asyncHandler(async (req, res) => {
  const { customer_id, order_id, points, description } = req.body;
  await query(
    `UPDATE loyalty_customers SET loyalty_points = loyalty_points + $1,
     visit_count = visit_count + 1, last_visit = NOW(), updated_at = NOW()
     WHERE id = $2`,
    [points, customer_id]
  );
  await query(
    `INSERT INTO loyalty_transactions (customer_id, order_id, transaction_type, points, description)
     VALUES ($1, $2, 'earn', $3, $4)`,
    [customer_id, order_id || null, points, description || 'Points earned']
  );
  const result = await query('SELECT * FROM loyalty_customers WHERE id = $1', [customer_id]);
  res.json(result.rows[0]);
}));

// POST /api/loyalty/redeem
router.post('/redeem', authenticate, asyncHandler(async (req, res) => {
  const { customer_id, order_id, points } = req.body;
  const customer = await query('SELECT * FROM loyalty_customers WHERE id = $1', [customer_id]);
  if (customer.rows.length === 0) throw notFound('Customer not found');
  if (parseFloat(customer.rows[0].loyalty_points) < points) {
    return res.status(400).json({ error: 'Insufficient loyalty points' });
  }
  await query(
    `UPDATE loyalty_customers SET loyalty_points = loyalty_points - $1, updated_at = NOW() WHERE id = $2`,
    [points, customer_id]
  );
  await query(
    `INSERT INTO loyalty_transactions (customer_id, order_id, transaction_type, points, description)
     VALUES ($1, $2, 'redeem', $3, 'Points redeemed')`,
    [customer_id, order_id || null, points]
  );
  const result = await query('SELECT * FROM loyalty_customers WHERE id = $1', [customer_id]);
  res.json(result.rows[0]);
}));

module.exports = router;
