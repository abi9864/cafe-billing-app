const express = require('express');
const router = express.Router();
const { query, getClient } = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler, notFound } = require('../middleware/errorHandler');
const { deductRecipeInventory, checkLowStockAfterDeduction } = require('../utils/recipeDeduction');

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

  const client = await getClient();
  try {
    await client.query('BEGIN');

    const currentResult = await client.query(`SELECT status FROM orders WHERE id = $1 FOR UPDATE`, [req.params.id]);
    if (currentResult.rows.length === 0) throw notFound('Order not found');
    const wasAlreadyCompleted = currentResult.rows[0].status === 'completed';

    const result = await client.query(
      `UPDATE orders SET status = $1, updated_at = NOW(),
       ${status === 'completed' ? 'completed_at = NOW(),' : ''}
       notes = CASE WHEN $2::text IS NOT NULL THEN COALESCE(notes, '') || ' [VOID: ' || $2::text || ']' ELSE notes END
       WHERE id = $3 RETURNING *`,
      [status, void_reason || null, req.params.id]
    );
    const order = result.rows[0];

    // Auto-deduct recipe ingredients from inventory — only on the transition
    // INTO 'completed', never again if the order was already completed
    // (guards against duplicate deductions from a repeated/retried request).
    let touchedInventoryIds = [];
    if (status === 'completed' && !wasAlreadyCompleted) {
      touchedInventoryIds = await deductRecipeInventory(client, order.id, req.user.id);
    }

    await client.query('COMMIT');

    // Low-stock alerts are checked after commit, outside the transaction,
    // and never block the response — a slow/failed email must not affect
    // order completion.
    checkLowStockAfterDeduction(query, touchedInventoryIds);

    res.json(order);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
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

// PUT /api/orders/:id/items
// Replaces all line items on an order (add / remove / change quantity) and
// recalculates subtotal, tax, discount, and total_amount from scratch, the
// same way order creation does. Only allowed on unpaid, non-final orders —
// once an order is paid or completed, items must be handled via a refund/void
// so the payment and shift totals stay consistent with what was charged.
router.put('/:id/items', authenticate, asyncHandler(async (req, res) => {
  const { items, discount_id } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    throw { message: 'items must be a non-empty array', statusCode: 400 };
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Lock the order row so a concurrent edit/payment can't race this update
    const orderResult = await client.query(
      `SELECT * FROM orders WHERE id = $1 FOR UPDATE`, [req.params.id]
    );
    if (orderResult.rows.length === 0) throw notFound('Order not found');
    const order = orderResult.rows[0];

    if (order.is_paid) {
      throw { message: 'Cannot edit items on a paid order — void or refund it first', statusCode: 400 };
    }
    if (['completed', 'cancelled'].includes(order.status)) {
      throw { message: `Cannot edit items on a ${order.status} order`, statusCode: 400 };
    }

    const taxResult = await client.query(
      `SELECT * FROM tax_rates WHERE location_id = $1 AND is_active = true`, [order.location_id]
    );

    let subtotal = 0;
    const orderItemsData = [];

    for (const item of items) {
      if (!item.quantity || item.quantity < 1) {
        throw { message: 'Each item needs a quantity of at least 1', statusCode: 400 };
      }
      const menuItem = await client.query(
        `SELECT mi.base_price, mv.price_modifier
         FROM menu_items mi
         LEFT JOIN menu_variants mv ON mv.id = $2
         WHERE mi.id = $1 AND mi.is_active = true`,
        [item.menu_item_id, item.variant_id || null]
      );
      if (menuItem.rows.length === 0) {
        throw { message: `Menu item not found or unavailable: ${item.menu_item_id}`, statusCode: 400 };
      }
      // Price is always recalculated server-side from the current menu price —
      // never trust a unit_price sent by the client.
      const unitPrice = parseFloat(menuItem.rows[0].base_price) + (parseFloat(menuItem.rows[0].price_modifier) || 0);
      subtotal += unitPrice * item.quantity;
      orderItemsData.push({ ...item, unit_price: unitPrice });
    }

    // The orders table only stores the resulting discount_amount, not which
    // discount produced it — so on an edit we preserve whatever discount is
    // already on the order unless the caller explicitly passes a new
    // discount_id (or discount_id: null to clear it).
    let discount_amount = parseFloat(order.discount_amount) || 0;
    if (discount_id !== undefined) {
      discount_amount = 0;
      if (discount_id) {
        const discResult = await client.query(
          `SELECT * FROM discounts WHERE id = $1 AND is_active = true
           AND (end_date IS NULL OR end_date > NOW())`,
          [discount_id]
        );
        if (discResult.rows.length > 0) {
          const disc = discResult.rows[0];
          discount_amount = disc.discount_type === 'percentage'
            ? subtotal * (disc.discount_value / 100)
            : disc.discount_value;
        }
      }
    }
    // Never let a preserved/flat discount exceed the new (possibly smaller) subtotal
    discount_amount = Math.min(discount_amount, subtotal);

    let tax_amount = 0;
    const taxableAmount = subtotal - discount_amount;
    for (const tax of taxResult.rows) {
      tax_amount += taxableAmount * (parseFloat(tax.tax_percentage) / 100);
    }
    const total_amount = taxableAmount + tax_amount;

    // Replace the line items wholesale — simplest and safest way to support
    // add / remove / change-quantity in one call without diffing state.
    await client.query(`DELETE FROM order_items WHERE order_id = $1`, [req.params.id]);
    for (const item of orderItemsData) {
      await client.query(
        `INSERT INTO order_items (order_id, menu_item_id, variant_id, quantity, unit_price,
                                  item_discount, special_instructions)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [req.params.id, item.menu_item_id, item.variant_id || null, item.quantity,
         item.unit_price, item.item_discount || 0, item.special_instructions || null]
      );
    }

    const updateResult = await client.query(
      `UPDATE orders SET subtotal = $1, tax_amount = $2, discount_amount = $3, total_amount = $4,
       updated_at = NOW() WHERE id = $5 RETURNING *`,
      [subtotal, tax_amount, discount_amount, total_amount, req.params.id]
    );

    await client.query('COMMIT');
    res.json(updateResult.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}));

module.exports = router;
