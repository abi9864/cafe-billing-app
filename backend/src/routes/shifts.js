const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler, notFound } = require('../middleware/errorHandler');

// GET /api/shifts
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const locId = req.query.location_id || req.user.location_id;
  const result = await query(
    `SELECT s.*, u.first_name || ' ' || u.last_name as user_name
     FROM shifts s JOIN users u ON s.user_id = u.id
     WHERE s.location_id = $1
     ORDER BY s.start_time DESC LIMIT 30`,
    [locId]
  );
  res.json(result.rows);
}));

// GET /api/shifts/current
router.get('/current', authenticate, asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT s.*, u.first_name || ' ' || u.last_name as user_name
     FROM shifts s JOIN users u ON s.user_id = u.id
     WHERE s.user_id = $1 AND s.status = 'open'
     ORDER BY s.start_time DESC LIMIT 1`,
    [req.user.id]
  );
  res.json(result.rows[0] || null);
}));

// POST /api/shifts/open
router.post('/open', authenticate, asyncHandler(async (req, res) => {
  const { opening_balance, location_id } = req.body;
  const locId = location_id || req.user.location_id;

  // Check for open shift
  const existing = await query(
    `SELECT id FROM shifts WHERE user_id = $1 AND status = 'open'`, [req.user.id]
  );
  if (existing.rows.length > 0) {
    return res.status(400).json({ error: 'You already have an open shift' });
  }

  const result = await query(
    `INSERT INTO shifts (location_id, user_id, shift_date, start_time, opening_balance)
     VALUES ($1, $2, CURRENT_DATE, NOW(), $3) RETURNING *`,
    [locId, req.user.id, opening_balance || 0]
  );
  res.status(201).json(result.rows[0]);
}));

// POST /api/shifts/:id/close
router.post('/:id/close', authenticate, asyncHandler(async (req, res) => {
  const { closing_balance, notes } = req.body;
  const result = await query(
    `UPDATE shifts SET status = 'closed', end_time = NOW(),
     closing_balance = $1, notes = COALESCE($2, notes), updated_at = NOW()
     WHERE id = $3 AND user_id = $4 RETURNING *`,
    [closing_balance || 0, notes || null, req.params.id, req.user.id]
  );
  if (result.rows.length === 0) throw notFound('Shift not found or not yours');
  res.json(result.rows[0]);
}));

module.exports = router;
