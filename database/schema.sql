-- Cafe Billing App - Database Schema
-- PostgreSQL Schema with all tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- 1. USERS & ROLES
-- ============================================

CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO roles (name, description) VALUES
  ('admin', 'Full system access'),
  ('manager', 'Manage cafe operations'),
  ('cashier', 'Handle POS and payments'),
  ('chef', 'View orders in kitchen'),
  ('staff', 'Basic staff access');

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  role_id INTEGER NOT NULL REFERENCES roles(id),
  is_active BOOLEAN DEFAULT true,
  location_id UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_location_id ON users(location_id);

-- ============================================
-- 2. CAFE LOCATIONS
-- ============================================

CREATE TABLE cafe_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  city VARCHAR(100),
  state VARCHAR(100),
  postal_code VARCHAR(20),
  phone VARCHAR(20),
  email VARCHAR(255),
  manager_id UUID REFERENCES users(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_locations_manager ON cafe_locations(manager_id);

-- Update users location_id foreign key
ALTER TABLE users ADD CONSTRAINT fk_users_location 
  FOREIGN KEY (location_id) REFERENCES cafe_locations(id);

-- ============================================
-- 3. MENU & CATEGORIES
-- ============================================

CREATE TABLE menu_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id UUID NOT NULL REFERENCES cafe_locations(id),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_menu_categories_location ON menu_categories(location_id);

CREATE TABLE menu_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id UUID NOT NULL REFERENCES cafe_locations(id),
  category_id UUID NOT NULL REFERENCES menu_categories(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  base_price DECIMAL(10, 2) NOT NULL,
  image_url VARCHAR(500),
  is_active BOOLEAN DEFAULT true,
  is_vegetarian BOOLEAN DEFAULT false,
  preparation_time INTEGER, -- in minutes
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_menu_items_location ON menu_items(location_id);
CREATE INDEX idx_menu_items_category ON menu_items(category_id);

-- ============================================
-- 4. MENU VARIANTS (Size modifiers)
-- ============================================

CREATE TABLE menu_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL, -- e.g., Small, Medium, Large
  price_modifier DECIMAL(10, 2) DEFAULT 0, -- additional price
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_menu_variants_item ON menu_variants(menu_item_id);

-- ============================================
-- 5. INVENTORY & STOCK
-- ============================================

CREATE TABLE inventory_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id UUID NOT NULL REFERENCES cafe_locations(id),
  item_name VARCHAR(255) NOT NULL,
  quantity_on_hand DECIMAL(10, 2) NOT NULL DEFAULT 0,
  unit_of_measure VARCHAR(50), -- e.g., kg, liters, pieces
  reorder_level DECIMAL(10, 2),
  reorder_quantity DECIMAL(10, 2),
  expiry_date DATE,
  supplier_id UUID,
  last_stock_check TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_inventory_location ON inventory_items(location_id);

CREATE TABLE inventory_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id),
  transaction_type VARCHAR(50), -- in, out, adjustment
  quantity DECIMAL(10, 2) NOT NULL,
  reference_type VARCHAR(50), -- order, manual, purchase
  reference_id UUID,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_inventory_transactions_item ON inventory_transactions(inventory_item_id);

-- Links a menu item to the inventory items it consumes per unit sold, so
-- completing an order can automatically deduct stock (see orders.js).
CREATE TABLE recipe_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  quantity_per_unit DECIMAL(10, 3) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (menu_item_id, inventory_item_id)
);

CREATE INDEX idx_recipe_items_menu_item ON recipe_items(menu_item_id);
CREATE INDEX idx_recipe_items_inventory_item ON recipe_items(inventory_item_id);

-- ============================================
-- 6. ORDERS & ORDER ITEMS
-- ============================================

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id UUID NOT NULL REFERENCES cafe_locations(id),
  order_number VARCHAR(50) UNIQUE NOT NULL,
  order_type VARCHAR(50) NOT NULL, -- dine-in, takeaway, delivery
  table_number VARCHAR(50),
  customer_name VARCHAR(255),
  customer_phone VARCHAR(20),
  notes TEXT,
  status VARCHAR(50) DEFAULT 'pending', -- pending, confirmed, preparing, ready, completed, cancelled
  created_by UUID NOT NULL REFERENCES users(id),
  assigned_to UUID REFERENCES users(id), -- kitchen staff
  subtotal DECIMAL(10, 2) DEFAULT 0,
  tax_amount DECIMAL(10, 2) DEFAULT 0,
  discount_amount DECIMAL(10, 2) DEFAULT 0,
  total_amount DECIMAL(10, 2) DEFAULT 0,
  is_paid BOOLEAN DEFAULT false,
  payment_method VARCHAR(50), -- cash, card, mobile, mixed
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE INDEX idx_orders_location ON orders(location_id);
CREATE INDEX idx_orders_created_by ON orders(created_by);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);

CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES menu_items(id),
  variant_id UUID REFERENCES menu_variants(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10, 2) NOT NULL,
  item_discount DECIMAL(10, 2) DEFAULT 0,
  special_instructions TEXT,
  status VARCHAR(50) DEFAULT 'pending', -- pending, confirmed, preparing, ready, served, cancelled
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_menu_item ON order_items(menu_item_id);

-- ============================================
-- 7. TAX CONFIGURATION
-- ============================================

CREATE TABLE tax_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id UUID NOT NULL REFERENCES cafe_locations(id),
  tax_name VARCHAR(100) NOT NULL, -- GST, VAT, Service Tax
  tax_percentage DECIMAL(5, 2) NOT NULL,
  category_id UUID REFERENCES menu_categories(id), -- NULL means apply to all
  is_applicable_on_discount BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tax_rates_location ON tax_rates(location_id);

-- ============================================
-- 8. DISCOUNTS & PROMOTIONS
-- ============================================

CREATE TABLE discounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id UUID NOT NULL REFERENCES cafe_locations(id),
  discount_code VARCHAR(50) UNIQUE,
  discount_name VARCHAR(255) NOT NULL,
  discount_type VARCHAR(50) NOT NULL, -- percentage, fixed
  discount_value DECIMAL(10, 2) NOT NULL,
  applicable_to VARCHAR(50), -- items, order, category
  menu_item_id UUID REFERENCES menu_items(id),
  category_id UUID REFERENCES menu_categories(id),
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  max_usage INTEGER,
  usage_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_discounts_location ON discounts(location_id);
CREATE INDEX idx_discounts_code ON discounts(discount_code);

-- ============================================
-- 9. PAYMENTS & TRANSACTIONS
-- ============================================

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  payment_method VARCHAR(50) NOT NULL, -- cash, card, mobile, check
  amount DECIMAL(10, 2) NOT NULL,
  transaction_id VARCHAR(255), -- for card/mobile payments
  status VARCHAR(50) DEFAULT 'success', -- success, pending, failed
  payment_gateway VARCHAR(100), -- stripe, razorpay, paypal, etc
  notes TEXT,
  processed_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payments_order ON payments(order_id);
CREATE INDEX idx_payments_transaction_id ON payments(transaction_id);

-- ============================================
-- 10. RECEIPTS
-- ============================================

CREATE TABLE receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  receipt_number VARCHAR(50) UNIQUE NOT NULL,
  receipt_content TEXT, -- JSON format
  printed_count INTEGER DEFAULT 0,
  printed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_receipts_order ON receipts(order_id);

-- ============================================
-- 11. LOYALTY & REWARDS
-- ============================================

CREATE TABLE loyalty_customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id UUID NOT NULL REFERENCES cafe_locations(id),
  phone_number VARCHAR(20) UNIQUE,
  email VARCHAR(255),
  customer_name VARCHAR(255),
  loyalty_points DECIMAL(10, 2) DEFAULT 0,
  total_spent DECIMAL(10, 2) DEFAULT 0,
  visit_count INTEGER DEFAULT 0,
  last_visit TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_loyalty_customers_location ON loyalty_customers(location_id);
CREATE INDEX idx_loyalty_customers_phone ON loyalty_customers(phone_number);

CREATE TABLE loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES loyalty_customers(id),
  order_id UUID REFERENCES orders(id),
  transaction_type VARCHAR(50), -- earn, redeem
  points DECIMAL(10, 2) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_loyalty_transactions_customer ON loyalty_transactions(customer_id);

-- ============================================
-- 12. SHIFT MANAGEMENT
-- ============================================

CREATE TABLE shifts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id UUID NOT NULL REFERENCES cafe_locations(id),
  user_id UUID NOT NULL REFERENCES users(id),
  shift_date DATE NOT NULL,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  opening_balance DECIMAL(10, 2) DEFAULT 0,
  closing_balance DECIMAL(10, 2),
  total_sales DECIMAL(10, 2) DEFAULT 0,
  total_cash DECIMAL(10, 2) DEFAULT 0,
  notes TEXT,
  status VARCHAR(50) DEFAULT 'open', -- open, closed
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_shifts_location ON shifts(location_id);
CREATE INDEX idx_shifts_user ON shifts(user_id);

-- ============================================
-- 13. AUDIT LOG
-- ============================================

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(255) NOT NULL,
  entity_type VARCHAR(100),
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- ============================================
-- 14. SETTINGS
-- ============================================

CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id UUID REFERENCES cafe_locations(id), -- NULL for system-wide settings
  setting_key VARCHAR(255) NOT NULL,
  setting_value TEXT,
  setting_type VARCHAR(50), -- string, integer, boolean, json
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(location_id, setting_key)
);

CREATE INDEX idx_settings_location ON settings(location_id);
CREATE INDEX idx_settings_key ON settings(setting_key);

-- ============================================
-- 15. SUPPLIER MANAGEMENT (Optional)
-- ============================================

CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id UUID NOT NULL REFERENCES cafe_locations(id),
  supplier_name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(20),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  postal_code VARCHAR(20),
  payment_terms VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_suppliers_location ON suppliers(location_id);

-- ============================================
-- Create Views for Reporting
-- ============================================

CREATE VIEW daily_sales_summary AS
SELECT
  DATE(o.created_at) as sales_date,
  o.location_id,
  COUNT(o.id) as total_orders,
  SUM(o.total_amount) as total_sales,
  SUM(o.tax_amount) as total_tax,
  SUM(o.discount_amount) as total_discounts,
  COUNT(DISTINCT o.created_by) as cashiers_count
FROM orders o
WHERE o.status IN ('completed', 'paid')
GROUP BY DATE(o.created_at), o.location_id;

CREATE VIEW top_selling_items AS
SELECT
  oi.menu_item_id,
  mi.name,
  mi.location_id,
  SUM(oi.quantity) as total_quantity,
  SUM(oi.quantity * oi.unit_price) as total_revenue
FROM order_items oi
JOIN menu_items mi ON oi.menu_item_id = mi.id
JOIN orders o ON oi.order_id = o.id
WHERE o.status IN ('completed', 'paid')
  AND o.created_at >= NOW() - INTERVAL '30 days'
GROUP BY oi.menu_item_id, mi.name, mi.location_id
ORDER BY total_quantity DESC;

-- ============================================
-- Create Indexes for Performance
-- ============================================

CREATE INDEX idx_orders_date_range ON orders(location_id, created_at);
CREATE INDEX idx_order_items_order_item ON order_items(order_id, menu_item_id);
CREATE INDEX idx_payments_date ON payments(created_at);
CREATE INDEX idx_inventory_stock_check ON inventory_items(location_id, quantity_on_hand);
