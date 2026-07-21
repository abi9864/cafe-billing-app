const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const MenuItem = sequelize.define('MenuItem', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(150),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  category_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  image_url: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  is_available: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  variants: {
    type: DataTypes.JSONB,
    defaultValue: null,
    comment: 'e.g. [{"name":"Small","price":100},{"name":"Medium","price":150},{"name":"Large","price":200}]',
  },
  ingredients: {
    type: DataTypes.JSONB,
    defaultValue: [],
  },
  location_id: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'null means available at all locations',
  },
  sort_order: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
}, {
  tableName: 'menu_items',
});

module.exports = MenuItem;
