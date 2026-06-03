const express = require('express');
const router = express.Router();
const { query, getClient } = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler, notFound } = require('../middleware/errorHandler');

// Generate order number
const generateOrderNumber = async (locationId) => {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const result = await query(
    `SELECT COUNT(*) FROM orders WHERE location_id = $1 AND DATE(created_at) = CURRENT_DATE`,
    [locationId]
  );
  const seq = String(parseInt(result.rows[0].count) + 1).padStart(4, '0');
  return `ORD-${today}-${seq}`;
};

// GET /api/orders
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const { location_id, status, order_type, date_from, date_to, limit = 50, offset = 0 } = req.query;
  const locId = location_id || req.user.location_id;

  let sql = `SELECT o.*,
                    u.first_name || ' ' || u.last_name as created_by_name,
                    COALESCE(
                      json_agg(
                        json_build_object(
                          'id', oi.id, 'menu_item_id', oi.menu_item_id, 'name', mi.name,
                          'quantity', oi.quantity, 'unit_price', oi.unit_price,
                          'item_discount', oi.item_discount, 'special_instructions', oi.special_instructions,
                          'status', oi.status, 'variant_id', oi.variant_id,
                          'variant_name', mv.name
                        )
                      ) FILTER (WHERE oi.id IS NOT NULL), '[]'
                    ) as items
             FROM orders o
             JOIN users u ON o.created_by = u.id
             LEFT JOIN order_items oi ON oi.order_id = o.id
             LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
             LEFT JOIN menu_variants mv ON oi.variant_id = mv.id
             WHERE o.location_id = $1`;
  const params = [locId];

  if (status) { params.push(status); sql += ` AND o.status = $${params.length}`; }
  if (order_type) { params.push(order_type); sql += ` AND o.order_type = $${params.length}`; }
  if (date_from) { params.push(date_from); sql += ` AND DATE(o.created_at) >= $${params.length}`; }
  if (date_to) { params.push(date_to); sql += ` AND DATE(o.created_at) <= $${params.length}`; }

  // Chef can only see active orders
  if (req.user.role_name === 'chef') {
    sql += ` AND o.status IN ('confirmed', 'preparing', 'ready')`;
  }

  sql += ` GROUP BY o.id, u.first_name, u.last_name ORDER BY o.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(parseInt(limit), parseInt(offset));

  const result = await query(sql, params);
  res.json(result.rows);
}));

// GET /api/orders/:id
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT o.*,
            u.first_name || ' ' || u.last_name as created_by_name,
            COALESCE(
              json_agg(
                json_build_object(
                  'id', oi.id, 'menu_item_id', oi.menu_item_id, 'name', mi.name,
                  'quantity', oi.quantity, 'unit_price', oi.unit_price,
                  'item_discount', oi.item_discount, 'special_instructions', oi.special_instructions,
                  'status', oi.status, 'variant_id', oi.variant_id, 'variant_name', mv.name
                )
              ) FILTER (WHERE oi.id IS NOT NULL), '[]'
            ) as items
     FROM orders o
     JOIN users u ON o.created_by = u.id
     LEFT JOIN order_items oi ON oi.order_id = o.id
     LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
     LEFT JOIN menu_variants mv ON oi.variant_id = mv.id
     WHERE o.id = $1
     GROUP BY o.id, u.first_name, u.last_name`,
    [req.params.id]
  );
  if (result.rows.length === 0) throw notFound('Order not found');
  res.json(result.rows[0]);
}));

// POST /api/orders
router.post('/', authenticate, asyncHandler(async (req, res) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const { location_id, order_type, table_number, customer_name, customer_phone, notes, items, discount_id } = req.body;
    const locId = location_id || req.user.location_id;

    // Get tax rates
    const taxResult = await client.query(
      `SELECT * FROM tax_rates WHERE location_id = $1 AND is_active = true`, [locId]
    );

    const order_number = await generateOrderNumber(locId);
    let subtotal = 0;
    const orderItemsData = [];

    // Validate and price items
    for (const item of items) {
      const menuItem = await client.query(
        `SELECT mi.base_price, mv.price_modifier, mi.name
         FROM menu_items mi
         LEFT JOIN menu_variants mv ON mv.id = $2
         WHERE mi.id = $1 AND mi.is_active = true`,
        [item.menu_item_id, item.variant_id || null]
      );
      if (menuItem.rows.length === 0) {
        throw { message: `Menu item not found: ${item.menu_item_id}`, statusCode: 400 };
      }
      const unitPrice = parseFloat(menuItem.rows[0].base_price) + (parseFloat(menuItem.rows[0].price_modifier) || 0);
      const lineTotal = unitPrice * item.quantity;
      subtotal += lineTotal;
      orderItemsData.push({ ...item, unit_price: unitPrice });
    }

    // Apply order-level discount
    let discount_amount = 0;
    if (discount_id) {
      const discResult = await client.query(
        `SELECT * FROM discounts WHERE id = $1 AND is_active = true
         AND (end_date IS NULL OR end_date > NOW())
         AND (max_usage IS NULL OR usage_count < max_usage)`,
        [discount_id]
      );
      if (discResult.rows.length > 0) {
        const disc = discResult.rows[0];
        if (disc.discount_type === 'percentage') {
          discount_amount = subtotal * (disc.discount_value / 100);
        } else {
          discount_amount = disc.discount_value;
        }
        await client.query('UPDATE discounts SET usage_count = usage_count + 1 WHERE id = $1', [discount_id]);
      }
    }

    // Calculate tax
    let tax_amount = 0;
    const taxableAmount = subtotal - discount_amount;
    for (const tax of taxResult.rows) {
      tax_amount += taxableAmount * (parseFloat(tax.tax_percentage) / 100);
    }

    const total_amount = taxableAmount + tax_amount;

    const orderResult = await client.query(
      `INSERT INTO orders (location_id, order_number, order_type, table_number, customer_name,
                           customer_phone, notes, status, created_by, subtotal, tax_amount,
                           discount_amount, total_amount)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8, $9, $10, $11, $12) RETURNING *`,
      [locId, order_number, order_type, table_number || null, customer_name || null,
       customer_phone || null, notes || null, req.user.id,
       subtotal, tax_amount, discount_amount, total_amount]
    );

    const orderId = orderResult.rows[0].id;

    for (const item of orderItemsData) {
      await client.query(
        `INSERT INTO order_items (order_id, menu_item_id, variant_id, quantity, unit_price,
                                  item_discount, special_instructions)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [orderId, item.menu_item_id, item.variant_id || null, item.quantity,
         item.unit_price, item.item_discount || 0, item.special_instructions || null]
      );
    }

    await client.query('COMMIT');
    res.status(201).json(orderResult.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}));

// PATCH /api/orders/:id/status
router.patch('/:id/status', authenticate, asyncHandler(async (req, res) => {
  const { status, void_reason } = req.body;
  const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const updates = { status };
  if (status === 'completed') updates.completed_at = 'NOW()';

  const result = await query(
    `UPDATE orders SET status = $1, updated_at = NOW(),
     ${status === 'completed' ? 'completed_at = NOW(),' : ''}
     notes = CASE WHEN $2::text IS NOT NULL THEN COALESCE(notes, '') || ' [VOID: ' || $2::text || ']' ELSE notes END
     WHERE id = $3 RETURNING *`,
    [status, void_reason || null, req.params.id]
  );
  if (result.rows.length === 0) throw notFound('Order not found');
  res.json(result.rows[0]);
}));

// PATCH /api/orders/:id/items/:itemId/status
router.patch('/:id/items/:itemId/status', authenticate, asyncHandler(async (req, res) => {
  const { status } = req.body;
  const result = await query(
    `UPDATE order_items SET status = $1, updated_at = NOW() WHERE id = $2 AND order_id = $3 RETURNING *`,
    [status, req.params.itemId, req.params.id]
  );
  if (result.rows.length === 0) throw notFound('Order item not found');
  res.json(result.rows[0]);
}));

module.exports = router;
