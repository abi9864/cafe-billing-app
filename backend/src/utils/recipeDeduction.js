const { sendLowStockAlert } = require('./mailer');

// Deducts recipe ingredients from inventory for every item on an order, and
// logs each deduction as an inventory_transactions row (reference_type:
// 'order'). Must be called INSIDE the same transaction that marks the order
// completed, using that transaction's client — so if anything downstream
// fails and rolls back, the deduction rolls back with it.
//
// Called from every place an order can become "completed":
//   - PATCH /api/orders/:id/status  (manual status button)
//   - POST /api/payments             (manual cash/card/mobile payment)
//   - POST /api/razorpay/verify      (Razorpay online payment)
// Each caller is responsible for its own idempotency guard (only call this
// on the transition INTO completed, never on an already-completed order).
const deductRecipeInventory = async (client, orderId, userId) => {
  const touchedInventoryIds = [];

  const itemsResult = await client.query(
    `SELECT oi.menu_item_id, oi.quantity FROM order_items oi WHERE oi.order_id = $1`,
    [orderId]
  );

  for (const orderItem of itemsResult.rows) {
    const recipeResult = await client.query(
      `SELECT * FROM recipe_items WHERE menu_item_id = $1`, [orderItem.menu_item_id]
    );
    for (const recipe of recipeResult.rows) {
      const deductQty = parseFloat(recipe.quantity_per_unit) * orderItem.quantity;
      await client.query(
        `UPDATE inventory_items SET quantity_on_hand = quantity_on_hand - $1,
         updated_at = NOW() WHERE id = $2`,
        [deductQty, recipe.inventory_item_id]
      );
      await client.query(
        `INSERT INTO inventory_transactions (inventory_item_id, transaction_type, quantity, reference_type, reference_id, notes, created_by)
         VALUES ($1, 'out', $2, 'order', $3, 'Auto-deducted on order completion', $4)`,
        [recipe.inventory_item_id, deductQty, orderId, userId]
      );
      touchedInventoryIds.push(recipe.inventory_item_id);
    }
  }

  return touchedInventoryIds;
};

// Checks the given inventory items for a low-stock condition and fires
// alerts. Call this AFTER the transaction commits (never inside it) — a
// slow/failed email must not affect order completion. Uses the plain
// (non-transactional) `query` function, passed in by the caller to avoid a
// require cycle with config/db.
const checkLowStockAfterDeduction = (query, inventoryIds) => {
  if (inventoryIds.length === 0) return;
  query(
    `SELECT * FROM inventory_items WHERE id = ANY($1::uuid[]) AND reorder_level IS NOT NULL AND quantity_on_hand <= reorder_level`,
    [[...new Set(inventoryIds)]]
  ).then(result => {
    result.rows.forEach(item => sendLowStockAlert(item));
  }).catch(err => console.error('Low-stock check after order completion failed:', err.message));
};

module.exports = { deductRecipeInventory, checkLowStockAfterDeduction };
