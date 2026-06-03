// Currency formatting
export const formatCurrency = (amount, symbol = '₹') => {
  const num = parseFloat(amount) || 0;
  return `${symbol}${num.toFixed(2)}`;
};

// Calculate cart totals with tax and discount
export const calculateTotals = (items, taxRates = [], discountInfo = null) => {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  let discountAmount = 0;
  if (discountInfo) {
    if (discountInfo.discount_type === 'percentage') {
      discountAmount = subtotal * (discountInfo.discount_value / 100);
    } else {
      discountAmount = Math.min(discountInfo.discount_value, subtotal);
    }
  }

  const taxableAmount = subtotal - discountAmount;
  const taxAmount = taxRates
    .filter(t => t.is_active)
    .reduce((sum, t) => sum + taxableAmount * (parseFloat(t.tax_percentage) / 100), 0);

  const total = taxableAmount + taxAmount;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    discountAmount: Math.round(discountAmount * 100) / 100,
    taxAmount: Math.round(taxAmount * 100) / 100,
    total: Math.round(total * 100) / 100
  };
};

// Change calculation for cash
export const calculateChange = (tendered, total) => {
  return Math.max(0, parseFloat(tendered) - parseFloat(total));
};
