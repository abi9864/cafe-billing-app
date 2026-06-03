import api from './api';

export const authService = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  me: () => api.get('/auth/me'),
  changePassword: (currentPassword, newPassword) =>
    api.post('/auth/change-password', { currentPassword, newPassword })
};

export const menuService = {
  getCategories: (params) => api.get('/menu/categories', { params }),
  createCategory: (data) => api.post('/menu/categories', data),
  updateCategory: (id, data) => api.put(`/menu/categories/${id}`, data),
  deleteCategory: (id) => api.delete(`/menu/categories/${id}`),

  getItems: (params) => api.get('/menu/items', { params }),
  getItem: (id) => api.get(`/menu/items/${id}`),
  createItem: (data) => api.post('/menu/items', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  updateItem: (id, data) => api.put(`/menu/items/${id}`, data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  deleteItem: (id) => api.delete(`/menu/items/${id}`),

  createVariant: (itemId, data) => api.post(`/menu/items/${itemId}/variants`, data),
  updateVariant: (id, data) => api.put(`/menu/variants/${id}`, data),
  deleteVariant: (id) => api.delete(`/menu/variants/${id}`)
};

export const orderService = {
  getOrders: (params) => api.get('/orders', { params }),
  getOrder: (id) => api.get(`/orders/${id}`),
  createOrder: (data) => api.post('/orders', data),
  updateStatus: (id, status, voidReason) =>
    api.patch(`/orders/${id}/status`, { status, void_reason: voidReason }),
  updateItemStatus: (orderId, itemId, status) =>
    api.patch(`/orders/${orderId}/items/${itemId}/status`, { status })
};

export const paymentService = {
  processPayment: (data) => api.post('/payments', data),
  getOrderPayments: (orderId) => api.get(`/payments/order/${orderId}`)
};

export const inventoryService = {
  getItems: (params) => api.get('/inventory', { params }),
  getItem: (id) => api.get(`/inventory/${id}`),
  getHistory: (id) => api.get(`/inventory/${id}/history`),
  createItem: (data) => api.post('/inventory', data),
  updateItem: (id, data) => api.put(`/inventory/${id}`, data),
  adjustStock: (id, data) => api.post(`/inventory/${id}/adjust`, data),
  getSuppliers: (params) => api.get('/inventory/suppliers/list', { params }),
  createSupplier: (data) => api.post('/inventory/suppliers', data)
};

export const discountService = {
  getDiscounts: (params) => api.get('/discounts', { params }),
  validateCode: (code, params) => api.get(`/discounts/validate/${code}`, { params }),
  createDiscount: (data) => api.post('/discounts', data),
  updateDiscount: (id, data) => api.put(`/discounts/${id}`, data)
};

export const reportService = {
  getSales: (params) => api.get('/reports/sales', { params }),
  getTopItems: (params) => api.get('/reports/top-items', { params }),
  getInventory: (params) => api.get('/reports/inventory', { params }),
  getTax: (params) => api.get('/reports/tax', { params }),
  getDashboardKPIs: (params) => api.get('/reports/dashboard-kpis', { params }),
  getPaymentTrends: (params) => api.get('/reports/payment-trends', { params })
};

export const settingsService = {
  getSettings: (params) => api.get('/settings', { params }),
  updateSettings: (data) => api.put('/settings', data),
  getTaxRates: (params) => api.get('/settings/tax-rates', { params }),
  createTaxRate: (data) => api.post('/settings/tax-rates', data),
  updateTaxRate: (id, data) => api.put(`/settings/tax-rates/${id}`, data),
  deleteTaxRate: (id) => api.delete(`/settings/tax-rates/${id}`)
};

export const userService = {
  getUsers: (params) => api.get('/users', { params }),
  getUser: (id) => api.get(`/users/${id}`),
  createUser: (data) => api.post('/users', data),
  updateUser: (id, data) => api.put(`/users/${id}`, data),
  getRoles: () => api.get('/users/roles/list')
};

export const locationService = {
  getLocations: () => api.get('/locations'),
  getLocation: (id) => api.get(`/locations/${id}`),
  createLocation: (data) => api.post('/locations', data),
  updateLocation: (id, data) => api.put(`/locations/${id}`, data)
};

export const shiftService = {
  getShifts: (params) => api.get('/shifts', { params }),
  getCurrentShift: () => api.get('/shifts/current'),
  openShift: (data) => api.post('/shifts/open', data),
  closeShift: (id, data) => api.post(`/shifts/${id}/close`, data)
};

export const loyaltyService = {
  getCustomers: (params) => api.get('/loyalty/customers', { params }),
  lookupCustomer: (phone) => api.get(`/loyalty/customers/lookup/${phone}`),
  createCustomer: (data) => api.post('/loyalty/customers', data),
  earnPoints: (data) => api.post('/loyalty/earn', data),
  redeemPoints: (data) => api.post('/loyalty/redeem', data)
};

export const receiptService = {
  getReceipt: (id) => api.get(`/receipts/${id}`),
  getByOrder: (orderId) => api.get(`/receipts/order/${orderId}`),
  printReceipt: (id) => api.post(`/receipts/${id}/print`)
};
