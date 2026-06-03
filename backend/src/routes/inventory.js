const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler, notFound } = require('../middleware/errorHandler');

// GET /api/inventory
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const { location_id, low_stock } = req.query;
  const locId = location_id || req.user.location_id;
  let sql = `SELECT ii.*, s.supplier_name
             FROM inventory_items ii
             LEFT JOIN suppliers s ON ii.supplier_id = s.id
             WHERE ii.location_id = $1`;
  const params = [locId];

  if (low_stock === 'true') {
    sql += ` AND ii.quantity_on_hand <= ii.reorder_level`;
  }
  sql += ' ORDER BY ii.item_name';

  const result = await query(sql, params);
  res.json(result.rows);
}));

// GET /api/inventory/:id
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT ii.*, s.supplier_name FROM inventory_items ii
     LEFT JOIN suppliers s ON ii.supplier_id = s.id
     WHERE ii.id = $1`,
    [req.params.id]
  );
  if (result.rows.length === 0) throw notFound('Inventory item not found');
  res.json(result.rows[0]);
}));

// GET /api/inventory/:id/history
router.get('/:id/history', authenticate, asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT it.*, u.first_name || ' ' || u.last_name as created_by_name
     FROM inventory_transactions it
     JOIN users u ON it.created_by = u.id
     WHERE it.inventory_item_id = $1
     ORDER BY it.created_at DESC LIMIT 50`,
    [req.params.id]
  );
  res.json(result.rows);
}));

// POST /api/inventory
router.post('/', authenticate, authorize('admin', 'manager'), asyncHandler(async (req, res) => {
  const { location_id, item_name, quantity_on_hand, unit_of_measure,
          reorder_level, reorder_quantity, expiry_date, supplier_id } = req.body;
  const locId = location_id || req.user.location_id;
  const result = await query(
    `INSERT INTO inventory_items (location_id, item_name, quantity_on_hand, unit_of_measure,
                                   reorder_level, reorder_quantity, expiry_date, supplier_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [locId, item_name, quantity_on_hand || 0, unit_of_measure || null,
     reorder_level || null, reorder_quantity || null, expiry_date || null, supplier_id || null]
  );
  res.status(201).json(result.rows[0]);
}));

// POST /api/inventory/:id/adjust
router.post('/:id/adjust', authenticate, authorize('admin', 'manager'), asyncHandler(async (req, res) => {
  const { quantity, transaction_type, notes } = req.body;
  // transaction_type: 'in' | 'out' | 'adjustment'
  const qty = parseFloat(quantity);
  const delta = transaction_type === 'out' ? -qty : qty;

  await query(
    `UPDATE inventory_items
     SET quantity_on_hand = quantity_on_hand + $1, updated_at = NOW(), last_stock_check = NOW()
     WHERE id = $2`,
    [delta, req.params.id]
  );
  await query(
    `INSERT INTO inventory_transactions (inventory_item_id, transaction_type, quantity, notes, created_by)
     VALUES ($1, $2, $3, $4, $5)`,
    [req.params.id, transaction_type, qty, notes || null, req.user.id]
  );

  const result = await query('SELECT * FROM inventory_items WHERE id = $1', [req.params.id]);
  res.json(result.rows[0]);
}));

// PUT /api/inventory/:id
router.put('/:id', authenticate, authorize('admin', 'manager'), asyncHandler(async (req, res) => {
  const { item_name, unit_of_measure, reorder_level, reorder_quantity, expiry_date, supplier_id } = req.body;
  const result = await query(
    `UPDATE inventory_items
     SET item_name = COALESCE($1, item_name),
         unit_of_measure = COALESCE($2, unit_of_measure),
         reorder_level = COALESCE($3, reorder_level),
         reorder_quantity = COALESCE($4, reorder_quantity),
         expiry_date = COALESCE($5, expiry_date),
         supplier_id = COALESCE($6, supplier_id),
         updated_at = NOW()
     WHERE id = $7 RETURNING *`,
    [item_name, unit_of_measure, reorder_level, reorder_quantity, expiry_date, supplier_id, req.params.id]
  );
  if (result.rows.length === 0) throw notFound('Inventory item not found');
  res.json(result.rows[0]);
}));

// GET /api/inventory/suppliers/list
router.get('/suppliers/list', authenticate, asyncHandler(async (req, res) => {
  const locId = req.query.location_id || req.user.location_id;
  const result = await query(
    `SELECT * FROM suppliers WHERE location_id = $1 AND is_active = true ORDER BY supplier_name`,
    [locId]
  );
  res.json(result.rows);
}));

// POST /api/inventory/suppliers
router.post('/suppliers', authenticate, authorize('admin', 'manager'), asyncHandler(async (req, res) => {
  const { location_id, supplier_name, contact_person, email, phone, address, city, state, postal_code, payment_terms } = req.body;
  const locId = location_id || req.user.location_id;
  const result = await query(
    `INSERT INTO suppliers (location_id, supplier_name, contact_person, email, phone, address, city, state, postal_code, payment_terms)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
    [locId, supplier_name, contact_person || null, email || null, phone || null,
     address || null, city || null, state || null, postal_code || null, payment_terms || null]
  );
  res.status(201).json(result.rows[0]);
}));

module.exports = router;
