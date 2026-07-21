const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { query } = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler, notFound } = require('../middleware/errorHandler');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/menu/'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `item_${Date.now()}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5242880 },
  fileFilter: (req, file, cb) => {
    if (/^image\//.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  }
});

// ---- CATEGORIES ----
// GET /api/menu/categories
router.get('/categories', authenticate, asyncHandler(async (req, res) => {
  const { location_id } = req.query;
  const locId = location_id || req.user.location_id;
  const result = await query(
    `SELECT * FROM menu_categories WHERE location_id = $1 ORDER BY display_order, name`,
    [locId]
  );
  res.json(result.rows);
}));

// POST /api/menu/categories
router.post('/categories', authenticate, authorize('admin', 'manager'), asyncHandler(async (req, res) => {
  const { name, description, display_order, location_id } = req.body;
  const locId = location_id || req.user.location_id;
  const result = await query(
    `INSERT INTO menu_categories (location_id, name, description, display_order)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [locId, name, description || null, display_order || 0]
  );
  res.status(201).json(result.rows[0]);
}));

// PUT /api/menu/categories/:id
router.put('/categories/:id', authenticate, authorize('admin', 'manager'), asyncHandler(async (req, res) => {
  const { name, description, display_order, is_active } = req.body;
  const result = await query(
    `UPDATE menu_categories
     SET name = COALESCE($1, name), description = COALESCE($2, description),
         display_order = COALESCE($3, display_order), is_active = COALESCE($4, is_active),
         updated_at = NOW()
     WHERE id = $5 RETURNING *`,
    [name, description, display_order, is_active, req.params.id]
  );
  if (result.rows.length === 0) throw notFound('Category not found');
  res.json(result.rows[0]);
}));

// DELETE /api/menu/categories/:id
router.delete('/categories/:id', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  await query('UPDATE menu_categories SET is_active = false WHERE id = $1', [req.params.id]);
  res.json({ message: 'Category deactivated' });
}));

// ---- MENU ITEMS ----
// GET /api/menu/items
router.get('/items', authenticate, asyncHandler(async (req, res) => {
  const { location_id, category_id, is_active, search } = req.query;
  const locId = location_id || req.user.location_id;
  let sql = `SELECT mi.*, mc.name as category_name,
                    COALESCE(json_agg(mv.*) FILTER (WHERE mv.id IS NOT NULL), '[]') as variants
             FROM menu_items mi
             JOIN menu_categories mc ON mi.category_id = mc.id
             LEFT JOIN menu_variants mv ON mv.menu_item_id = mi.id
             WHERE mi.location_id = $1`;
  const params = [locId];

  if (category_id) { params.push(category_id); sql += ` AND mi.category_id = $${params.length}`; }
  if (is_active !== undefined) { params.push(is_active === 'true'); sql += ` AND mi.is_active = $${params.length}`; }
  if (search) { params.push(`%${search}%`); sql += ` AND mi.name ILIKE $${params.length}`; }

  sql += ' GROUP BY mi.id, mc.name ORDER BY mi.display_order, mi.name';
  const result = await query(sql, params);
  res.json(result.rows);
}));

// GET /api/menu/items/:id
router.get('/items/:id', authenticate, asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT mi.*, mc.name as category_name,
            COALESCE(json_agg(mv.*) FILTER (WHERE mv.id IS NOT NULL), '[]') as variants
     FROM menu_items mi
     JOIN menu_categories mc ON mi.category_id = mc.id
     LEFT JOIN menu_variants mv ON mv.menu_item_id = mi.id
     WHERE mi.id = $1
     GROUP BY mi.id, mc.name`,
    [req.params.id]
  );
  if (result.rows.length === 0) throw notFound('Menu item not found');
  res.json(result.rows[0]);
}));

// POST /api/menu/items
router.post('/items', authenticate, authorize('admin', 'manager'),
  upload.single('image'),
  asyncHandler(async (req, res) => {
    const { location_id, category_id, name, description, base_price,
            is_vegetarian, preparation_time, display_order } = req.body;
    const locId = location_id || req.user.location_id;
    const image_url = req.file ? `/uploads/menu/${req.file.filename}` : null;

    const result = await query(
      `INSERT INTO menu_items (location_id, category_id, name, description, base_price,
                               image_url, is_vegetarian, preparation_time, display_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [locId, category_id, name, description || null, parseFloat(base_price),
       image_url, is_vegetarian === 'true', parseInt(preparation_time) || null, parseInt(display_order) || 0]
    );
    res.status(201).json(result.rows[0]);
  })
);

// PUT /api/menu/items/:id
router.put('/items/:id', authenticate, authorize('admin', 'manager'),
  upload.single('image'),
  asyncHandler(async (req, res) => {
    const { category_id, name, description, base_price,
            is_vegetarian, preparation_time, display_order, is_active } = req.body;
    const image_url = req.file ? `/uploads/menu/${req.file.filename}` : undefined;

    let sql = `UPDATE menu_items SET
      category_id = COALESCE($1, category_id),
      name = COALESCE($2, name),
      description = COALESCE($3, description),
      base_price = COALESCE($4, base_price),
      is_vegetarian = COALESCE($5, is_vegetarian),
      preparation_time = COALESCE($6, preparation_time),
      display_order = COALESCE($7, display_order),
      is_active = COALESCE($8, is_active),
      updated_at = NOW()`;

    const params = [category_id, name, description, base_price ? parseFloat(base_price) : null,
                    is_vegetarian !== undefined ? is_vegetarian === 'true' : null,
                    preparation_time ? parseInt(preparation_time) : null,
                    display_order ? parseInt(display_order) : null, is_active];

    if (image_url) {
      params.push(image_url);
      sql += `, image_url = $${params.length}`;
    }
    params.push(req.params.id);
    sql += ` WHERE id = $${params.length} RETURNING *`;

    const result = await query(sql, params);
    if (result.rows.length === 0) throw notFound('Menu item not found');
    res.json(result.rows[0]);
  })
);

// DELETE /api/menu/items/:id
router.delete('/items/:id', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  await query('UPDATE menu_items SET is_active = false WHERE id = $1', [req.params.id]);
  res.json({ message: 'Menu item deactivated' });
}));

// ---- VARIANTS ----
// POST /api/menu/items/:id/variants
router.post('/items/:id/variants', authenticate, authorize('admin', 'manager'), asyncHandler(async (req, res) => {
  const { name, price_modifier } = req.body;
  const result = await query(
    `INSERT INTO menu_variants (menu_item_id, name, price_modifier) VALUES ($1, $2, $3) RETURNING *`,
    [req.params.id, name, parseFloat(price_modifier) || 0]
  );
  res.status(201).json(result.rows[0]);
}));

// PUT /api/menu/variants/:id
router.put('/variants/:id', authenticate, authorize('admin', 'manager'), asyncHandler(async (req, res) => {
  const { name, price_modifier } = req.body;
  const result = await query(
    `UPDATE menu_variants SET name = COALESCE($1, name), price_modifier = COALESCE($2, price_modifier)
     WHERE id = $3 RETURNING *`,
    [name, price_modifier ? parseFloat(price_modifier) : null, req.params.id]
  );
  if (result.rows.length === 0) throw notFound('Variant not found');
  res.json(result.rows[0]);
}));

// DELETE /api/menu/variants/:id
router.delete('/variants/:id', authenticate, authorize('admin', 'manager'), asyncHandler(async (req, res) => {
  await query('DELETE FROM menu_variants WHERE id = $1', [req.params.id]);
  res.json({ message: 'Variant deleted' });
}));

// GET /api/menu/items/:id/recipe
// Lists the inventory ingredients (and how much of each) one unit of this
// menu item consumes — used to auto-deduct stock when an order completes.
router.get('/items/:id/recipe', authenticate, asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT ri.*, ii.item_name, ii.unit_of_measure, ii.quantity_on_hand
     FROM recipe_items ri
     JOIN inventory_items ii ON ri.inventory_item_id = ii.id
     WHERE ri.menu_item_id = $1
     ORDER BY ii.item_name`,
    [req.params.id]
  );
  res.json(result.rows);
}));

// POST /api/menu/items/:id/recipe
// Adds (or updates, if the ingredient is already linked) one ingredient line.
router.post('/items/:id/recipe', authenticate, authorize('admin', 'manager'), asyncHandler(async (req, res) => {
  const { inventory_item_id, quantity_per_unit } = req.body;
  if (!inventory_item_id || !quantity_per_unit || parseFloat(quantity_per_unit) <= 0) {
    throw { message: 'inventory_item_id and a positive quantity_per_unit are required', statusCode: 400 };
  }
  const result = await query(
    `INSERT INTO recipe_items (menu_item_id, inventory_item_id, quantity_per_unit)
     VALUES ($1, $2, $3)
     ON CONFLICT (menu_item_id, inventory_item_id)
     DO UPDATE SET quantity_per_unit = EXCLUDED.quantity_per_unit
     RETURNING *`,
    [req.params.id, inventory_item_id, parseFloat(quantity_per_unit)]
  );
  res.status(201).json(result.rows[0]);
}));

// DELETE /api/menu/items/:itemId/recipe/:recipeItemId
router.delete('/items/:itemId/recipe/:recipeItemId', authenticate, authorize('admin', 'manager'), asyncHandler(async (req, res) => {
  await query('DELETE FROM recipe_items WHERE id = $1 AND menu_item_id = $2', [req.params.recipeItemId, req.params.itemId]);
  res.json({ message: 'Ingredient removed from recipe' });
}));

module.exports = router;
