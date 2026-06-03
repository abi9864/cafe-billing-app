const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Order = sequelize.define('Order', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  order_number: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
  },
  order_type: {
    type: DataTypes.ENUM('dine-in', 'takeaway', 'delivery'),
    defaultValue: 'dine-in',
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'),
    defaultValue: 'pending',
    allowNull: false,
  },
  subtotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
  },
  tax_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
  },
  discount_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
  },
  total: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  cancel_reason: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  location_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  discount_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  table_number: {
    type: DataTypes.STRING(10),
    allowNull: true,
  },
}, {
  tableName: 'orders',
});

// Generate order number before creation
Order.beforeCreate(async (order) => {
  const today = new Date();
  const prefix = `RC${today.getFullYear().toString().slice(-2)}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
  const count = await Order.count({
    where: sequelize.where(
      sequelize.fn('DATE', sequelize.col('created_at')),
      today.toISOString().split('T')[0]
    ),
  });
  order.order_number = `${prefix}-${String(count + 1).padStart(4, '0')}`;
});

module.exports = Order;
