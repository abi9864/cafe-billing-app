const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const { query } = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler, notFound } = require('../middleware/errorHandler');

// GET /api/users
router.get('/', authenticate, authorize('admin', 'manager'), asyncHandler(async (req, res) => {
  const { location_id, role, is_active } = req.query;
  let sql = `SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.is_active,
                    u.location_id, r.name as role_name, cl.name as location_name,
                    u.last_login, u.created_at
             FROM users u
             JOIN roles r ON u.role_id = r.id
             LEFT JOIN cafe_locations cl ON u.location_id = cl.id
             WHERE 1=1`;
  const params = [];

  if (location_id) { params.push(location_id); sql += ` AND u.location_id = $${params.length}`; }
  if (role) { params.push(role); sql += ` AND r.name = $${params.length}`; }
  if (is_active !== undefined) { params.push(is_active === 'true'); sql += ` AND u.is_active = $${params.length}`; }

  // Managers can only see users in their location
  if (req.user.role_name === 'manager' && req.user.location_id) {
    params.push(req.user.location_id);
    sql += ` AND u.location_id = $${params.length}`;
  }

  sql += ' ORDER BY u.created_at DESC';
  const result = await query(sql, params);
  res.json(result.rows);
}));

// GET /api/users/:id
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.is_active,
            u.location_id, r.name as role_name, cl.name as location_name, u.created_at
     FROM users u
     JOIN roles r ON u.role_id = r.id
     LEFT JOIN cafe_locations cl ON u.location_id = cl.id
     WHERE u.id = $1`,
    [req.params.id]
  );
  if (result.rows.length === 0) throw notFound('User not found');
  res.json(result.rows[0]);
}));

// POST /api/users
router.post(
  '/',
  authenticate,
  authorize('admin', 'manager'),
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('first_name').trim().notEmpty(),
    body('last_name').trim().notEmpty(),
    body('role_id').isInt({ min: 1 })
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Validation failed', details: errors.array() });

    const { email, password, first_name, last_name, phone, role_id, location_id } = req.body;
    const hash = await bcrypt.hash(password, 12);

    const result = await query(
      `INSERT INTO users (email, password_hash, first_name, last_name, phone, role_id, location_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, email, first_name, last_name, role_id, location_id`,
      [email, hash, first_name, last_name, phone || null, role_id, location_id || null]
    );
    res.status(201).json(result.rows[0]);
  })
);

// PUT /api/users/:id
router.put(
  '/:id',
  authenticate,
  authorize('admin', 'manager'),
  asyncHandler(async (req, res) => {
    const { first_name, last_name, phone, role_id, location_id, is_active } = req.body;
    const result = await query(
      `UPDATE users SET first_name = COALESCE($1, first_name),
                        last_name = COALESCE($2, last_name),
                        phone = COALESCE($3, phone),
                        role_id = COALESCE($4, role_id),
                        location_id = COALESCE($5, location_id),
                        is_active = COALESCE($6, is_active),
                        updated_at = NOW()
       WHERE id = $7
       RETURNING id, email, first_name, last_name, role_id, location_id, is_active`,
      [first_name, last_name, phone, role_id, location_id, is_active, req.params.id]
    );
    if (result.rows.length === 0) throw notFound('User not found');
    res.json(result.rows[0]);
  })
);

// GET /api/users/roles/list
router.get('/roles/list', authenticate, asyncHandler(async (req, res) => {
  const result = await query('SELECT * FROM roles ORDER BY id');
  res.json(result.rows);
}));

module.exports = router;
