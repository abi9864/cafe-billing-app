import { createSlice } from '@reduxjs/toolkit';

const cartSlice = createSlice({
  name: 'cart',
  initialState: {
    items: [],
    orderType: 'dine-in',
    tableNumber: '',
    customerName: '',
    customerPhone: '',
    notes: '',
    discountId: null,
    discountInfo: null,
    loyaltyCustomerId: null
  },
  reducers: {
    addItem: (state, action) => {
      const { id, variantId, name, price, variantName } = action.payload;
      const key = `${id}-${variantId || 'base'}`;
      const existing = state.items.find(i => i.key === key);
      if (existing) {
        existing.quantity += 1;
      } else {
        state.items.push({ key, id, variantId: variantId || null, name, price, variantName: variantName || null, quantity: 1, specialInstructions: '' });
      }
    },
    removeItem: (state, action) => {
      state.items = state.items.filter(i => i.key !== action.payload);
    },
    updateQuantity: (state, action) => {
      const { key, quantity } = action.payload;
      const item = state.items.find(i => i.key === key);
      if (item) {
        if (quantity <= 0) {
          state.items = state.items.filter(i => i.key !== key);
        } else {
          item.quantity = quantity;
        }
      }
    },
    updateInstructions: (state, action) => {
      const { key, instructions } = action.payload;
      const item = state.items.find(i => i.key === key);
      if (item) item.specialInstructions = instructions;
    },
    setOrderType: (state, action) => { state.orderType = action.payload; },
    setTableNumber: (state, action) => { state.tableNumber = action.payload; },
    setCustomerInfo: (state, action) => {
      state.customerName = action.payload.name || '';
      state.customerPhone = action.payload.phone || '';
    },
    setNotes: (state, action) => { state.notes = action.payload; },
    setDiscount: (state, action) => {
      state.discountId = action.payload?.id || null;
      state.discountInfo = action.payload || null;
    },
    clearCart: (state) => {
      state.items = [];
      state.orderType = 'dine-in';
      state.tableNumber = '';
      state.customerName = '';
      state.customerPhone = '';
      state.notes = '';
      state.discountId = null;
      state.discountInfo = null;
      state.loyaltyCustomerId = null;
    }
  }
});

export const { addItem, removeItem, updateQuantity, updateInstructions,
               setOrderType, setTableNumber, setCustomerInfo, setNotes,
               setDiscount, clearCart } = cartSlice.actions;
export default cartSlice.reducer;
