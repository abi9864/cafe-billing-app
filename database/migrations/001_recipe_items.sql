-- Migration: recipe_items
-- Links a menu item (recipe) to the inventory items it consumes per unit sold,
-- so completing an order can automatically deduct stock.
-- Run this against an EXISTING database with:
--   docker exec -i cafe_billing_postgres psql -U postgres -d cafe_billing < database/migrations/001_recipe_items.sql
-- (Fresh installs get this automatically since it's also folded into schema.sql)

CREATE TABLE IF NOT EXISTS recipe_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  quantity_per_unit DECIMAL(10, 3) NOT NULL, -- how much of this ingredient one unit of the menu item consumes
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (menu_item_id, inventory_item_id)
);

CREATE INDEX IF NOT EXISTS idx_recipe_items_menu_item ON recipe_items(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_recipe_items_inventory_item ON recipe_items(inventory_item_id);
