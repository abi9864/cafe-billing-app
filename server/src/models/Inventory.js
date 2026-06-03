const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Inventory = sequelize.define('Inventory', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  menu_item_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  location_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  low_stock_threshold: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 10,
  },
  unit: {
    type: DataTypes.STRING(20),
    defaultValue: 'pieces',
  },
}, {
  tableName: 'inventory',
});

const InventoryLog = sequelize.define('InventoryLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  inventory_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  change_quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  previous_quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  new_quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  reason: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
}, {
  tableName: 'inventory_logs',
});

module.exports = { Inventory, InventoryLog };
