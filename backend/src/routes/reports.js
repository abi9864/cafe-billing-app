const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

// GET /api/reports/sales
router.get('/sales', authenticate, authorize('admin', 'manager'), asyncHandler(async (req, res) => {
  const { location_id, date_from, date_to, group_by = 'day' } = req.query;
  const locId = location_id || req.user.location_id;

  let dateFormat;
  switch (group_by) {
    case 'hour': dateFormat = 'YYYY-MM-DD HH24:00'; break;
    case 'week': dateFormat = 'YYYY-WW'; break;
    case 'month': dateFormat = 'YYYY-MM'; break;
    default: dateFormat = 'YYYY-MM-DD';
  }

  const params = [locId];
  let dateFilter = '';
  if (date_from) { params.push(date_from); dateFilter += ` AND DATE(o.created_at) >= $${params.length}`; }
  if (date_to) { params.push(date_to); dateFilter += ` AND DATE(o.created_at) <= $${params.length}`; }

  const salesData = await query(
    `SELECT TO_CHAR(o.created_at, '${dateFormat}') as period,
            COUNT(*) as order_count,
            SUM(o.subtotal) as subtotal,
            SUM(o.tax_amount) as tax_amount,
            SUM(o.discount_amount) as discount_amount,
            SUM(o.total_amount) as total_revenue,
            COUNT(CASE WHEN o.payment_method = 'cash' THEN 1 END) as cash_orders,
            COUNT(CASE WHEN o.payment_method = 'card' THEN 1 END) as card_orders,
            COUNT(CASE WHEN o.payment_method = 'mobile' THEN 1 END) as mobile_orders
     FROM orders o
     WHERE o.location_id = $1 AND o.status = 'completed' ${dateFilter}
     GROUP BY period ORDER BY period`,
    params
  );

  const summary = await query(
    `SELECT COUNT(*) as total_orders,
            SUM(o.total_amount) as total_revenue,
            AVG(o.total_amount) as avg_order_value,
            SUM(o.tax_amount) as total_tax,
            SUM(o.discount_amount) as total_discounts
     FROM orders o
     WHERE o.location_id = $1 AND o.status = 'completed' ${dateFilter}`,
    params
  );

  res.json({ data: salesData.rows, summary: summary.rows[0] });
}));

// GET /api/reports/top-items
router.get('/top-items', authenticate, authorize('admin', 'manager'), asyncHandler(async (req, res) => {
  const { location_id, date_from, date_to, limit = 10 } = req.query;
  const locId = location_id || req.user.location_id;

  const params = [locId, parseInt(limit)];
  let dateFilter = '';
  if (date_from) { params.push(date_from); dateFilter += ` AND DATE(o.created_at) >= $${params.length}`; }
  if (date_to) { params.push(date_to); dateFilter += ` AND DATE(o.created_at) <= $${params.length}`; }

  const result = await query(
    `SELECT mi.name, mi.id, mc.name as category_name,
            SUM(oi.quantity) as total_quantity,
            SUM(oi.quantity * oi.unit_price) as total_revenue,
            COUNT(DISTINCT o.id) as order_count
     FROM order_items oi
     JOIN orders o ON oi.order_id = o.id
     JOIN menu_items mi ON oi.menu_item_id = mi.id
     JOIN menu_categories mc ON mi.category_id = mc.id
     WHERE o.location_id = $1 AND o.status = 'completed' ${dateFilter}
     GROUP BY mi.id, mi.name, mc.name
     ORDER BY total_quantity DESC LIMIT $2`,
    params
  );
  res.json(result.rows);
}));

// GET /api/reports/inventory
router.get('/inventory', authenticate, authorize('admin', 'manager'), asyncHandler(async (req, res) => {
  const locId = req.query.location_id || req.user.location_id;
  const result = await query(
    `SELECT ii.*, s.supplier_name,
            CASE WHEN ii.reorder_level IS NOT NULL AND ii.quantity_on_hand <= ii.reorder_level
                 THEN true ELSE false END as is_low_stock
     FROM inventory_items ii
     LEFT JOIN suppliers s ON ii.supplier_id = s.id
     WHERE ii.location_id = $1
     ORDER BY is_low_stock DESC, ii.item_name`,
    [locId]
  );
  res.json(result.rows);
}));

// GET /api/reports/tax
router.get('/tax', authenticate, authorize('admin', 'manager'), asyncHandler(async (req, res) => {
  const { location_id, date_from, date_to } = req.query;
  const locId = location_id || req.user.location_id;

  const params = [locId];
  let dateFilter = '';
  if (date_from) { params.push(date_from); dateFilter += ` AND DATE(o.created_at) >= $${params.length}`; }
  if (date_to) { params.push(date_to); dateFilter += ` AND DATE(o.created_at) <= $${params.length}`; }

  const result = await query(
    `SELECT SUM(o.tax_amount) as total_tax,
            SUM(o.subtotal) as total_subtotal,
            SUM(o.total_amount) as total_revenue,
            COUNT(*) as total_orders,
            DATE_TRUNC('month', o.created_at) as month
     FROM orders o
     WHERE o.location_id = $1 AND o.status = 'completed' ${dateFilter}
     GROUP BY month ORDER BY month`,
    params
  );
  res.json(result.rows);
}));

// GET /api/reports/dashboard-kpis
router.get('/dashboard-kpis', authenticate, asyncHandler(async (req, res) => {
  const locId = req.query.location_id || req.user.location_id;

  const [todaySales, weekSales, lowStock, activeOrders, topItem] = await Promise.all([
    query(`SELECT COUNT(*) as orders, COALESCE(SUM(total_amount), 0) as revenue
           FROM orders WHERE location_id = $1 AND status = 'completed' AND DATE(created_at) = CURRENT_DATE`, [locId]),
    query(`SELECT COUNT(*) as orders, COALESCE(SUM(total_amount), 0) as revenue
           FROM orders WHERE location_id = $1 AND status = 'completed'
           AND created_at >= NOW() - INTERVAL '7 days'`, [locId]),
    query(`SELECT COUNT(*) as count FROM inventory_items
           WHERE location_id = $1 AND reorder_level IS NOT NULL AND quantity_on_hand <= reorder_level`, [locId]),
    query(`SELECT COUNT(*) as count FROM orders
           WHERE location_id = $1 AND status IN ('pending', 'confirmed', 'preparing', 'ready')`, [locId]),
    query(`SELECT mi.name, SUM(oi.quantity) as qty
           FROM order_items oi JOIN orders o ON oi.order_id = o.id
           JOIN menu_items mi ON oi.menu_item_id = mi.id
           WHERE o.location_id = $1 AND DATE(o.created_at) = CURRENT_DATE AND o.status = 'completed'
           GROUP BY mi.id, mi.name ORDER BY qty DESC LIMIT 1`, [locId])
  ]);

  res.json({
    today: todaySales.rows[0],
    week: weekSales.rows[0],
    low_stock_count: parseInt(lowStock.rows[0].count),
    active_orders: parseInt(activeOrders.rows[0].count),
    top_item_today: topItem.rows[0] || null
  });
}));

// GET /api/reports/payment-trends
router.get('/payment-trends', authenticate, authorize('admin', 'manager'), asyncHandler(async (req, res) => {
  const { location_id, date_from, date_to } = req.query;
  const locId = location_id || req.user.location_id;

  const params = [locId];
  let dateFilter = '';
  if (date_from) { params.push(date_from); dateFilter += ` AND DATE(o.created_at) >= $${params.length}`; }
  if (date_to) { params.push(date_to); dateFilter += ` AND DATE(o.created_at) <= $${params.length}`; }

  const result = await query(
    `SELECT payment_method, COUNT(*) as count, SUM(total_amount) as total
     FROM orders WHERE location_id = $1 AND status = 'completed' ${dateFilter}
     GROUP BY payment_method`,
    params
  );
  res.json(result.rows);
}));

module.exports = router;
