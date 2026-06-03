const sequelize = require('../config/database');
const User = require('./User');
const Location = require('./Location');
const Category = require('./Category');
const MenuItem = require('./MenuItem');
const Order = require('./Order');
const OrderItem = require('./OrderItem');
const Payment = require('./Payment');
const { Inventory, InventoryLog } = require('./Inventory');

// Location associations
Location.hasMany(User, { foreignKey: 'location_id' });
User.belongsTo(Location, { foreignKey: 'location_id' });

Location.hasMany(Order, { foreignKey: 'location_id' });
Order.belongsTo(Location, { foreignKey: 'location_id' });

// Category associations
Category.hasMany(MenuItem, { foreignKey: 'category_id' });
MenuItem.belongsTo(Category, { foreignKey: 'category_id' });

// Order associations
User.hasMany(Order, { foreignKey: 'user_id' });
Order.belongsTo(User, { foreignKey: 'user_id', as: 'cashier' });

Order.hasMany(OrderItem, { foreignKey: 'order_id', as: 'items' });
OrderItem.belongsTo(Order, { foreignKey: 'order_id' });

MenuItem.hasMany(OrderItem, { foreignKey: 'menu_item_id' });
OrderItem.belongsTo(MenuItem, { foreignKey: 'menu_item_id' });

// Payment associations
Order.hasOne(Payment, { foreignKey: 'order_id' });
Payment.belongsTo(Order, { foreignKey: 'order_id' });

// Inventory associations
MenuItem.hasMany(Inventory, { foreignKey: 'menu_item_id' });
Inventory.belongsTo(MenuItem, { foreignKey: 'menu_item_id' });

Location.hasMany(Inventory, { foreignKey: 'location_id' });
Inventory.belongsTo(Location, { foreignKey: 'location_id' });

Inventory.hasMany(InventoryLog, { foreignKey: 'inventory_id', as: 'logs' });
InventoryLog.belongsTo(Inventory, { foreignKey: 'inventory_id' });

User.hasMany(InventoryLog, { foreignKey: 'user_id' });
InventoryLog.belongsTo(User, { foreignKey: 'user_id' });

module.exports = {
  sequelize,
  User,
  Location,
  Category,
  MenuItem,
  Order,
  OrderItem,
  Payment,
  Inventory,
  InventoryLog,
};
