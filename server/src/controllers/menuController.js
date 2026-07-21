const { Category, MenuItem } = require('../models');

exports.getCategories = async (req, res, next) => {
  try {
    const categories = await Category.findAll({
      where: { is_active: true },
      order: [['sort_order', 'ASC']],
    });
    res.json({ categories });
  } catch (error) {
    next(error);
  }
};

exports.createCategory = async (req, res, next) => {
  try {
    const { name, description, icon, sort_order } = req.body;
    const category = await Category.create({ name, description, icon, sort_order });
    res.status(201).json({ message: 'Category created.', category });
  } catch (error) {
    next(error);
  }
};

exports.updateCategory = async (req, res, next) => {
  try {
    const category = await Category.findByPk(req.params.id);
    if (!category) return res.status(404).json({ error: 'Category not found.' });
    await category.update(req.body);
    res.json({ message: 'Category updated.', category });
  } catch (error) {
    next(error);
  }
};

exports.deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findByPk(req.params.id);
    if (!category) return res.status(404).json({ error: 'Category not found.' });
    await category.update({ is_active: false });
    res.json({ message: 'Category deactivated.' });
  } catch (error) {
    next(error);
  }
};

// Menu Items
exports.getMenuItems = async (req, res, next) => {
  try {
    const { category_id, available } = req.query;
    const where = {};
    if (category_id) where.category_id = category_id;
    if (available !== undefined) where.is_available = available === 'true';

    const items = await MenuItem.findAll({
      where,
      include: [{ model: Category, attributes: ['id', 'name'] }],
      order: [['sort_order', 'ASC']],
    });
    res.json({ items });
  } catch (error) {
    next(error);
  }
};

exports.createMenuItem = async (req, res, next) => {
  try {
    const item = await MenuItem.create(req.body);
    res.status(201).json({ message: 'Menu item created.', item });
  } catch (error) {
    next(error);
  }
};

exports.updateMenuItem = async (req, res, next) => {
  try {
    const item = await MenuItem.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: 'Menu item not found.' });
    await item.update(req.body);
    res.json({ message: 'Menu item updated.', item });
  } catch (error) {
    next(error);
  }
};

exports.deleteMenuItem = async (req, res, next) => {
  try {
    const item = await MenuItem.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: 'Menu item not found.' });
    await item.update({ is_available: false });
    res.json({ message: 'Menu item disabled.' });
  } catch (error) {
    next(error);
  }
};
