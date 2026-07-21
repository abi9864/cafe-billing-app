-- Cafe Billing App - Seed Data
-- Run after schema.sql

-- ============================================
-- SEED: CAFE LOCATION
-- ============================================
INSERT INTO cafe_locations (id, name, address, city, state, postal_code, phone, email)
VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Cafe Billing App - Main', '12 Coffee Lane, CBD', 'Mumbai', 'Maharashtra', '400001', '+91-22-12345678', 'main@cafebillingapp.com'),
  ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Cafe Billing App - Andheri', '45 Cafe Street, Andheri West', 'Mumbai', 'Maharashtra', '400058', '+91-22-87654321', 'andheri@cafebillingapp.com');

-- ============================================
-- SEED: USERS (password = "password123" for all)
-- bcrypt hash for "password123" with 12 rounds
-- ============================================
INSERT INTO users (id, email, password_hash, first_name, last_name, phone, role_id, location_id)
VALUES
  ('a1000000-0000-0000-0000-000000000001', 'admin@cafe.com',
   '$2a$12$po7ZFZFMWC6bfDkAlD6maOCOq1e2nfHB1S06SeKHGo2U7Qn.SL5W2',
   'Admin', 'User', '+91-9000000001', 1, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('a1000000-0000-0000-0000-000000000002', 'manager@cafe.com',
   '$2a$12$po7ZFZFMWC6bfDkAlD6maOCOq1e2nfHB1S06SeKHGo2U7Qn.SL5W2',
   'Sarah', 'Manager', '+91-9000000002', 2, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('a1000000-0000-0000-0000-000000000003', 'cashier@cafe.com',
   '$2a$12$po7ZFZFMWC6bfDkAlD6maOCOq1e2nfHB1S06SeKHGo2U7Qn.SL5W2',
   'John', 'Cashier', '+91-9000000003', 3, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('a1000000-0000-0000-0000-000000000004', 'chef@cafe.com',
   '$2a$12$po7ZFZFMWC6bfDkAlD6maOCOq1e2nfHB1S06SeKHGo2U7Qn.SL5W2',
   'Ravi', 'Chef', '+91-9000000004', 4, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890');

-- ============================================
-- SEED: MENU CATEGORIES
-- ============================================
INSERT INTO menu_categories (id, location_id, name, description, display_order)
VALUES
  ('ca000001-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Coffee', 'Hot and cold coffee beverages', 1),
  ('ca000001-0000-0000-0000-000000000002', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Tea & Infusions', 'Teas and herbal drinks', 2),
  ('ca000001-0000-0000-0000-000000000003', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Pastries', 'Fresh baked pastries and cakes', 3),
  ('ca000001-0000-0000-0000-000000000004', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Sandwiches', 'Gourmet sandwiches and wraps', 4),
  ('ca000001-0000-0000-0000-000000000005', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Cold Beverages', 'Juices, smoothies and cold drinks', 5),
  ('ca000001-0000-0000-0000-000000000006', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Snacks', 'Light bites and snacks', 6),
  -- Andheri branch
  ('ca000002-0000-0000-0000-000000000001', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Coffee', 'Hot and cold coffee beverages', 1),
  ('ca000002-0000-0000-0000-000000000002', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Tea & Infusions', 'Teas and herbal drinks', 2),
  ('ca000002-0000-0000-0000-000000000003', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Pastries', 'Fresh baked pastries', 3);

-- ============================================
-- SEED: MENU ITEMS (Main branch)
-- ============================================
INSERT INTO menu_items (id, location_id, category_id, name, description, base_price, is_vegetarian, preparation_time, display_order)
VALUES
  -- Coffee
  ('a1e00001-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'ca000001-0000-0000-0000-000000000001', 'Espresso', 'Rich, bold single shot espresso', 80.00, true, 3, 1),
  ('a1e00001-0000-0000-0000-000000000002', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'ca000001-0000-0000-0000-000000000001', 'Cappuccino', 'Classic cappuccino with steamed milk foam', 150.00, true, 5, 2),
  ('a1e00001-0000-0000-0000-000000000003', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'ca000001-0000-0000-0000-000000000001', 'Latte', 'Smooth espresso with steamed milk', 160.00, true, 5, 3),
  ('a1e00001-0000-0000-0000-000000000004', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'ca000001-0000-0000-0000-000000000001', 'Cold Brew Coffee', 'Slow-steeped cold brew, served over ice', 180.00, true, 2, 4),
  ('a1e00001-0000-0000-0000-000000000005', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'ca000001-0000-0000-0000-000000000001', 'Mocha', 'Espresso with chocolate and steamed milk', 170.00, true, 5, 5),
  ('a1e00001-0000-0000-0000-000000000006', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'ca000001-0000-0000-0000-000000000001', 'Americano', 'Espresso diluted with hot water', 120.00, true, 3, 6),
  -- Tea
  ('a1e00001-0000-0000-0000-000000000007', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'ca000001-0000-0000-0000-000000000002', 'Masala Chai', 'Traditional spiced Indian tea', 80.00, true, 4, 1),
  ('a1e00001-0000-0000-0000-000000000008', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'ca000001-0000-0000-0000-000000000002', 'Green Tea', 'Premium Japanese green tea', 100.00, true, 3, 2),
  ('a1e00001-0000-0000-0000-000000000009', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'ca000001-0000-0000-0000-000000000002', 'Chamomile Tea', 'Calming chamomile herbal infusion', 120.00, true, 3, 3),
  -- Pastries
  ('a1e00001-0000-0000-0000-000000000010', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'ca000001-0000-0000-0000-000000000003', 'Croissant', 'Buttery, flaky classic croissant', 80.00, true, 2, 1),
  ('a1e00001-0000-0000-0000-000000000011', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'ca000001-0000-0000-0000-000000000003', 'Chocolate Muffin', 'Rich dark chocolate muffin', 90.00, true, 2, 2),
  ('a1e00001-0000-0000-0000-000000000012', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'ca000001-0000-0000-0000-000000000003', 'Blueberry Cheesecake', 'Creamy NY-style cheesecake with blueberries', 180.00, true, 2, 3),
  -- Sandwiches
  ('a1e00001-0000-0000-0000-000000000013', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'ca000001-0000-0000-0000-000000000004', 'Club Sandwich', 'Triple-decker with chicken, cheese and veggies', 220.00, false, 8, 1),
  ('a1e00001-0000-0000-0000-000000000014', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'ca000001-0000-0000-0000-000000000004', 'Veggie Wrap', 'Fresh vegetables in a whole wheat wrap', 180.00, true, 7, 2),
  ('a1e00001-0000-0000-0000-000000000015', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'ca000001-0000-0000-0000-000000000004', 'Grilled Chicken Sandwich', 'Grilled chicken breast with lettuce and tomato', 240.00, false, 10, 3),
  -- Cold Beverages
  ('a1e00001-0000-0000-0000-000000000016', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'ca000001-0000-0000-0000-000000000005', 'Mango Smoothie', 'Fresh mango blended with yogurt', 160.00, true, 5, 1),
  ('a1e00001-0000-0000-0000-000000000017', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'ca000001-0000-0000-0000-000000000005', 'Fresh Lime Soda', 'Refreshing lime soda with mint', 80.00, true, 3, 2),
  ('a1e00001-0000-0000-0000-000000000018', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'ca000001-0000-0000-0000-000000000005', 'Iced Tea', 'Chilled lemon iced tea', 100.00, true, 3, 3),
  -- Snacks
  ('a1e00001-0000-0000-0000-000000000019', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'ca000001-0000-0000-0000-000000000006', 'Nachos with Salsa', 'Crispy nachos with homemade salsa dip', 140.00, true, 5, 1),
  ('a1e00001-0000-0000-0000-000000000020', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'ca000001-0000-0000-0000-000000000006', 'French Fries', 'Golden crispy fries with seasoning', 120.00, true, 8, 2);

-- ============================================
-- SEED: MENU VARIANTS
-- ============================================
INSERT INTO menu_variants (menu_item_id, name, price_modifier)
VALUES
  ('a1e00001-0000-0000-0000-000000000001', 'Single', 0),
  ('a1e00001-0000-0000-0000-000000000001', 'Double', 40),
  ('a1e00001-0000-0000-0000-000000000002', 'Regular', 0),
  ('a1e00001-0000-0000-0000-000000000002', 'Large', 30),
  ('a1e00001-0000-0000-0000-000000000003', 'Regular', 0),
  ('a1e00001-0000-0000-0000-000000000003', 'Large', 30),
  ('a1e00001-0000-0000-0000-000000000003', 'Extra Large', 60),
  ('a1e00001-0000-0000-0000-000000000005', 'Regular', 0),
  ('a1e00001-0000-0000-0000-000000000005', 'Large', 30);

-- ============================================
-- SEED: TAX RATES
-- ============================================
INSERT INTO tax_rates (location_id, tax_name, tax_percentage, is_active)
VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'GST', 5.00, true),
  ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'GST', 5.00, true);

-- ============================================
-- SEED: DISCOUNTS
-- ============================================
INSERT INTO discounts (location_id, discount_code, discount_name, discount_type, discount_value, applicable_to, is_active)
VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'WELCOME10', 'Welcome Discount 10%', 'percentage', 10.00, 'order', true),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'FLAT50', 'Flat Rs.50 Off', 'fixed', 50.00, 'order', true),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'HAPPY20', 'Happy Hour 20%', 'percentage', 20.00, 'order', true);

-- ============================================
-- SEED: INVENTORY ITEMS
-- ============================================
INSERT INTO inventory_items (location_id, item_name, quantity_on_hand, unit_of_measure, reorder_level, reorder_quantity)
VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Coffee Beans (Arabica)', 10.00, 'kg', 2.00, 5.00),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Whole Milk', 20.00, 'liters', 5.00, 20.00),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Sugar', 15.00, 'kg', 3.00, 10.00),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Green Tea Bags', 100.00, 'pieces', 20.00, 100.00),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Croissant Dough', 30.00, 'pieces', 10.00, 30.00),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Chocolate Powder', 5.00, 'kg', 1.00, 3.00),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Bread Loaves', 8.00, 'pieces', 3.00, 10.00),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Chicken Breast', 3.00, 'kg', 1.00, 5.00);

-- ============================================
-- SEED: SETTINGS
-- ============================================
INSERT INTO settings (location_id, setting_key, setting_value, setting_type)
VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'receipt_footer', 'Thank you for visiting Cafe Billing App! Come back soon.', 'string'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'receipt_logo', '', 'string'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'currency_symbol', '₹', 'string'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'loyalty_points_per_rupee', '1', 'integer'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'loyalty_rupees_per_point', '0.10', 'string'),
  (NULL, 'app_name', 'Cafe Billing App', 'string'),
  (NULL, 'tax_inclusive', 'false', 'boolean');

-- Update manager for location
UPDATE cafe_locations SET manager_id = 'a1000000-0000-0000-0000-000000000002'
WHERE id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';


