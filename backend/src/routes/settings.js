const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

// GET /api/settings
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const locId = req.query.location_id || req.user.location_id;
  const result = await query(
    `SELECT * FROM settings WHERE location_id = $1 OR location_id IS NULL ORDER BY setting_key`,
    [locId]
  );
  const settings = {};
  result.rows.forEach(s => { settings[s.setting_key] = s.setting_value; });
  res.json(settings);
}));

// PUT /api/settings
router.put('/', authenticate, authorize('admin', 'manager'), asyncHandler(async (req, res) => {
  const locId = req.body.location_id || req.user.location_id;
  const { settings } = req.body; // { key: value }

  for (const [key, value] of Object.entries(settings)) {
    await query(
      `INSERT INTO settings (location_id, setting_key, setting_value)
       VALUES ($1, $2, $3)
       ON CONFLICT (location_id, setting_key)
       DO UPDATE SET setting_value = $3, updated_at = NOW()`,
      [locId, key, String(value)]
    );
  }
  res.json({ message: 'Settings updated' });
}));

// ---- TAX RATES ----
// GET /api/settings/tax-rates
router.get('/tax-rates', authenticate, asyncHandler(async (req, res) => {
  const locId = req.query.location_id || req.user.location_id;
  const result = await query(
    `SELECT tr.*, mc.name as category_name
     FROM tax_rates tr
     LEFT JOIN menu_categories mc ON tr.category_id = mc.id
     WHERE tr.location_id = $1
     ORDER BY tr.tax_name`,
    [locId]
  );
  res.json(result.rows);
}));

// POST /api/settings/tax-rates
router.post('/tax-rates', authenticate, authorize('admin', 'manager'), asyncHandler(async (req, res) => {
  const { location_id, tax_name, tax_percentage, category_id, is_applicable_on_discount } = req.body;
  const locId = location_id || req.user.location_id;
  const result = await query(
    `INSERT INTO tax_rates (location_id, tax_name, tax_percentage, category_id, is_applicable_on_discount)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [locId, tax_name, tax_percentage, category_id || null, is_applicable_on_discount || false]
  );
  res.status(201).json(result.rows[0]);
}));

// PUT /api/settings/tax-rates/:id
router.put('/tax-rates/:id', authenticate, authorize('admin', 'manager'), asyncHandler(async (req, res) => {
  const { tax_name, tax_percentage, is_active } = req.body;
  const result = await query(
    `UPDATE tax_rates SET tax_name = COALESCE($1, tax_name),
                          tax_percentage = COALESCE($2, tax_percentage),
                          is_active = COALESCE($3, is_active),
                          updated_at = NOW()
     WHERE id = $4 RETURNING *`,
    [tax_name, tax_percentage, is_active, req.params.id]
  );
  res.json(result.rows[0]);
}));

// DELETE /api/settings/tax-rates/:id
router.delete('/tax-rates/:id', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  await query('UPDATE tax_rates SET is_active = false WHERE id = $1', [req.params.id]);
  res.json({ message: 'Tax rate deactivated' });
}));

module.exports = router;
