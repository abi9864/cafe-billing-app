const { Op } = require('sequelize');
const { Order, OrderItem, MenuItem, Payment, User, sequelize } = require('../models');

exports.createOrder = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { order_type, items, notes, table_number, discount_id } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Order must have at least one item.' });
    }

    // Calculate totals
    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const menuItem = await MenuItem.findByPk(item.menu_item_id);
      if (!menuItem || !menuItem.is_available) {
        await transaction.rollback();
        return res.status(400).json({ error: `Item "${item.menu_item_id}" is not available.` });
      }

      const unitPrice = item.variant_price || parseFloat(menuItem.price);
      const totalPrice = unitPrice * item.quantity;
      subtotal += totalPrice;

      orderItems.push({
        menu_item_id: menuItem.id,
        item_name: menuItem.name,
        quantity: item.quantity,
        unit_price: unitPrice,
        total_price: totalPrice,
        variant: item.variant || null,
        notes: item.notes || null,
      });
    }

    // TODO: Apply tax and discount calculations
    const taxAmount = subtotal * 0.05; // Default 5% tax
    const discountAmount = 0;
    const total = subtotal + taxAmount - discountAmount;

    const order = await Order.create({
      order_type,
      subtotal,
      tax_amount: taxAmount,
      discount_amount: discountAmount,
      total,
      notes,
      table_number,
      user_id: req.user.id,
      location_id: req.user.location_id,
      discount_id,
    }, { transaction });

    // Create order items
    for (const item of orderItems) {
      await OrderItem.create({ ...item, order_id: order.id }, { transaction });
    }

    await transaction.commit();

    const fullOrder = await Order.findByPk(order.id, {
      include: [{ model: OrderItem, as: 'items' }],
    });

    res.status(201).json({ message: 'Order created.', order: fullOrder });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

exports.getOrders = async (req, res, next) => {
  try {
    const { status, order_type, date, page = 1, limit = 20 } = req.query;
    const where = { location_id: req.user.location_id };

    if (status) where.status = status;
    if (order_type) where.order_type = order_type;
    if (date) {
      where.createdAt = {
        [Op.gte]: new Date(`${date}T00:00:00`),
        [Op.lt]: new Date(`${date}T23:59:59`),
      };
    }

    const offset = (page - 1) * limit;
    const { rows: orders, count } = await Order.findAndCountAll({
      where,
      include: [
        { model: OrderItem, as: 'items' },
        { model: User, as: 'cashier', attributes: ['id', 'name'] },
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset,
    });

    res.json({ orders, total: count, page: parseInt(page), pages: Math.ceil(count / limit) });
  } catch (error) {
    next(error);
  }
};

exports.getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findByPk(req.params.id, {
      include: [
        { model: OrderItem, as: 'items', include: [MenuItem] },
        { model: Payment },
        { model: User, as: 'cashier', attributes: ['id', 'name'] },
      ],
    });

    if (!order) return res.status(404).json({ error: 'Order not found.' });
    res.json({ order });
  } catch (error) {
    next(error);
  }
};

exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { status, cancel_reason } = req.body;
    const order = await Order.findByPk(req.params.id);

    if (!order) return res.status(404).json({ error: 'Order not found.' });

    const updateData = { status };
    if (status === 'cancelled' && cancel_reason) {
      updateData.cancel_reason = cancel_reason;
    }

    await order.update(updateData);
    res.json({ message: 'Order status updated.', order });
  } catch (error) {
    next(error);
  }
};
