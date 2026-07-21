const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler, notFound } = require('../middleware/errorHandler');

// GET /api/locations
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT cl.*, u.first_name || ' ' || u.last_name as manager_name
     FROM cafe_locations cl
     LEFT JOIN users u ON cl.manager_id = u.id
     ORDER BY cl.name`
  );
  res.json(result.rows);
}));

// GET /api/locations/:id
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT cl.*, u.first_name || ' ' || u.last_name as manager_name
     FROM cafe_locations cl
     LEFT JOIN users u ON cl.manager_id = u.id
     WHERE cl.id = $1`,
    [req.params.id]
  );
  if (result.rows.length === 0) throw notFound('Location not found');
  res.json(result.rows[0]);
}));

// POST /api/locations
router.post('/', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const { name, address, city, state, postal_code, phone, email, manager_id } = req.body;
  const result = await query(
    `INSERT INTO cafe_locations (name, address, city, state, postal_code, phone, email, manager_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [name, address, city, state, postal_code, phone, email, manager_id || null]
  );
  res.status(201).json(result.rows[0]);
}));

// PUT /api/locations/:id
router.put('/:id', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const { name, address, city, state, postal_code, phone, email, manager_id, is_active } = req.body;
  const result = await query(
    `UPDATE cafe_locations
     SET name = COALESCE($1, name), address = COALESCE($2, address),
         city = COALESCE($3, city), state = COALESCE($4, state),
         postal_code = COALESCE($5, postal_code), phone = COALESCE($6, phone),
         email = COALESCE($7, email), manager_id = COALESCE($8, manager_id),
         is_active = COALESCE($9, is_active), updated_at = NOW()
     WHERE id = $10 RETURNING *`,
    [name, address, city, state, postal_code, phone, email, manager_id, is_active, req.params.id]
  );
  if (result.rows.length === 0) throw notFound('Location not found');
  res.json(result.rows[0]);
}));

module.exports = router;
