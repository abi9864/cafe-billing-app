const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler, notFound } = require('../middleware/errorHandler');

// GET /api/discounts
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const locId = req.query.location_id || req.user.location_id;
  const result = await query(
    `SELECT d.*, mi.name as menu_item_name, mc.name as category_name
     FROM discounts d
     LEFT JOIN menu_items mi ON d.menu_item_id = mi.id
     LEFT JOIN menu_categories mc ON d.category_id = mc.id
     WHERE d.location_id = $1
     ORDER BY d.created_at DESC`,
    [locId]
  );
  res.json(result.rows);
}));

// GET /api/discounts/validate/:code
router.get('/validate/:code', authenticate, asyncHandler(async (req, res) => {
  const locId = req.query.location_id || req.user.location_id;
  const result = await query(
    `SELECT * FROM discounts
     WHERE discount_code = $1 AND location_id = $2 AND is_active = true
     AND (start_date IS NULL OR start_date <= NOW())
     AND (end_date IS NULL OR end_date > NOW())
     AND (max_usage IS NULL OR usage_count < max_usage)`,
    [req.params.code, locId]
  );
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Invalid or expired discount code' });
  }
  res.json(result.rows[0]);
}));

// POST /api/discounts
router.post('/', authenticate, authorize('admin', 'manager'), asyncHandler(async (req, res) => {
  const { location_id, discount_code, discount_name, discount_type, discount_value,
          applicable_to, menu_item_id, category_id, start_date, end_date, max_usage } = req.body;
  const locId = location_id || req.user.location_id;
  const result = await query(
    `INSERT INTO discounts (location_id, discount_code, discount_name, discount_type, discount_value,
                             applicable_to, menu_item_id, category_id, start_date, end_date, max_usage)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
    [locId, discount_code || null, discount_name, discount_type, discount_value,
     applicable_to || 'order', menu_item_id || null, category_id || null,
     start_date || null, end_date || null, max_usage || null]
  );
  res.status(201).json(result.rows[0]);
}));

// PUT /api/discounts/:id
router.put('/:id', authenticate, authorize('admin', 'manager'), asyncHandler(async (req, res) => {
  const { discount_name, discount_value, start_date, end_date, max_usage, is_active } = req.body;
  const result = await query(
    `UPDATE discounts
     SET discount_name = COALESCE($1, discount_name),
         discount_value = COALESCE($2, discount_value),
         start_date = COALESCE($3, start_date),
         end_date = COALESCE($4, end_date),
         max_usage = COALESCE($5, max_usage),
         is_active = COALESCE($6, is_active),
         updated_at = NOW()
     WHERE id = $7 RETURNING *`,
    [discount_name, discount_value, start_date, end_date, max_usage, is_active, req.params.id]
  );
  if (result.rows.length === 0) throw notFound('Discount not found');
  res.json(result.rows[0]);
}));

module.exports = router;
