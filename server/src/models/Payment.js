const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Payment = sequelize.define('Payment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  order_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  method: {
    type: DataTypes.ENUM('cash', 'card', 'upi', 'wallet', 'split'),
    allowNull: false,
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  amount_received: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: 'For cash payments - amount given by customer',
  },
  change_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  reference: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Transaction ID or reference number',
  },
  status: {
    type: DataTypes.ENUM('pending', 'completed', 'failed', 'refunded'),
    defaultValue: 'pending',
    allowNull: false,
  },
  split_details: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'For split payments: [{method, amount, reference}]',
  },
}, {
  tableName: 'payments',
});

module.exports = Payment;
