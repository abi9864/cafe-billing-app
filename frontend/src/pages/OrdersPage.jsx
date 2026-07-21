import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { RefreshCw, Search, Eye, CheckCircle2, XCircle, ChefHat, Clock, IndianRupee, Banknote, CreditCard, Smartphone, Wallet, Pencil, Plus, Minus, Trash2 } from 'lucide-react';
import { orderService, paymentService, razorpayService, menuService, settingsService } from '../services';
import { formatCurrency } from '../utils/calculations';
import ReceiptModal from '../components/POS/ReceiptModal';

const STATUS_COLORS = {
  pending: 'badge-yellow',
  confirmed: 'badge-blue',
  preparing: 'badge-blue',
  ready: 'badge-green',
  completed: 'badge-gray',
  cancelled: 'badge-red'
};

const STATUS_FLOW = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['completed', 'cancelled'],
  completed: [],
  cancelled: []
};

const STATUS_LABELS = {
  confirmed: { label: 'Confirm', icon: CheckCircle2, cls: 'hover:bg-green-50 text-green-600' },
  preparing: { label: 'Preparing', icon: ChefHat, cls: 'hover:bg-orange-50 text-orange-500' },
  ready: { label: 'Ready', icon: Clock, cls: 'hover:bg-blue-50 text-blue-600' },
  completed: { label: 'Complete', icon: CheckCircle2, cls: 'hover:bg-green-50 text-green-700' },
  cancelled: { label: 'Cancel', icon: XCircle, cls: 'hover:bg-red-50 text-red-500' }
};

export default function OrdersPage() {
  const { user } = useSelector(s => s.auth);
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [paymentOrder, setPaymentOrder] = useState(null);
  const [editOrder, setEditOrder] = useState(null);
  const [receiptOrder, setReceiptOrder] = useState(null);

  const { data: orders = [], isFetching, refetch } = useQuery({
    queryKey: ['orders', user?.locationId, statusFilter],
    queryFn: () => orderService.getOrders({
      location_id: user?.locationId,
      status: statusFilter || undefined,
      limit: 50
    }).then(r => r.data),
    refetchInterval: 30000
  });

  // Shared by both manual payment recording and Razorpay verification, since
  // both end with the same order/dashboard state changing on the backend.
  const onPaymentRecorded = () => {
    qc.invalidateQueries({ queryKey: ['orders'] });
    qc.invalidateQueries({ queryKey: ['kpis'] });
    qc.invalidateQueries({ queryKey: ['sales-week'] });
    qc.invalidateQueries({ queryKey: ['top-items'] });
    qc.invalidateQueries({ queryKey: ['payment-trends'] });
    setReceiptOrder(paymentOrder);
    setPaymentOrder(null);
  };

  const paymentMutation = useMutation({
    mutationFn: ({ orderId, payments }) => paymentService.processPayment({ order_id: orderId, payments }),
    onSuccess: () => {
      onPaymentRecorded();
      toast.success('Payment recorded successfully');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Payment failed')
  });

  const razorpayVerifyMutation = useMutation({
    mutationFn: (data) => razorpayService.verifyPayment(data),
    onSuccess: () => {
      onPaymentRecorded();
      toast.success('Payment received via Razorpay');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Payment verification failed')
  });

  const editItemsMutation = useMutation({
    mutationFn: ({ orderId, items, discount_id }) => orderService.updateItems(orderId, { items, discount_id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['kpis'] });
      setEditOrder(null);
      toast.success('Order updated');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Could not update order')
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => orderService.updateStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      // Sync dashboard so KPIs and active-orders count update immediately
      qc.invalidateQueries({ queryKey: ['kpis'] });
      qc.invalidateQueries({ queryKey: ['sales-week'] });
      qc.invalidateQueries({ queryKey: ['top-items'] });
      qc.invalidateQueries({ queryKey: ['payment-trends'] });
      toast.success('Order status updated');
    },
    onError: () => toast.error('Failed to update status')
  });

  // Always use live order from the query cache so modal stays fresh after status updates
  const liveSelectedOrder = selectedOrder
    ? orders.find(o => o.id === selectedOrder.id) || selectedOrder
    : null;

  const filteredOrders = orders.filter(o =>
    !search || o.order_number.toLowerCase().includes(search.toLowerCase()) ||
    o.customer_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
        <button onClick={() => refetch()} className="btn-secondary btn-sm" disabled={isFetching}>
          <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            className="input pl-9 w-64"
            placeholder="Search order / customer..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['', 'pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-lg text-sm capitalize transition-colors ${
                statusFilter === s
                  ? 'bg-cafe-dark text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Order #</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Time</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Type</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Customer</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Items</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Total</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">Status</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredOrders.map(order => (
                <tr key={order.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-mono font-semibold text-gray-900">{order.order_number}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {format(new Date(order.created_at), 'HH:mm')}
                    <span className="text-xs block text-gray-400">{format(new Date(order.created_at), 'dd/MM')}</span>
                  </td>
                  <td className="px-4 py-3 capitalize">
                    <span className="badge badge-gray">{order.order_type}</span>
                    {order.table_number && <span className="ml-1 text-xs text-gray-500">T{order.table_number}</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{order.customer_name || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{order.items?.length || 0} items</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">
                    ₹{parseFloat(order.total_amount).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={STATUS_COLORS[order.status] || 'badge-gray'}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="p-1.5 rounded hover:bg-blue-50 text-blue-600"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {!order.is_paid && order.status !== 'cancelled' && (
                        <button
                          onClick={() => setPaymentOrder(order)}
                          className="p-1.5 rounded hover:bg-green-50 text-green-600"
                          title="Collect Payment"
                        >
                          <IndianRupee className="w-4 h-4" />
                        </button>
                      )}
                      {!order.is_paid && !['completed', 'cancelled'].includes(order.status) && (
                        <button
                          onClick={() => setEditOrder(order)}
                          className="p-1.5 rounded hover:bg-orange-50 text-orange-600"
                          title="Edit Items"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      )}
                      {STATUS_FLOW[order.status]?.filter(s => s !== 'cancelled').map(nextStatus => {
                        const cfg = STATUS_LABELS[nextStatus];
                        if (!cfg) return null;
                        const Icon = cfg.icon;
                        return (
                          <button
                            key={nextStatus}
                            onClick={() => updateStatusMutation.mutate({ id: order.id, status: nextStatus })}
                            className={`p-1.5 rounded ${cfg.cls}`}
                            title={cfg.label}
                            disabled={updateStatusMutation.isPending}
                          >
                            <Icon className="w-4 h-4" />
                          </button>
                        );
                      })}
                      {STATUS_FLOW[order.status]?.includes('cancelled') && (
                        <button
                          onClick={() => {
                            if (confirm('Cancel this order?')) {
                              updateStatusMutation.mutate({ id: order.id, status: 'cancelled' });
                            }
                          }}
                          className="p-1.5 rounded hover:bg-red-50 text-red-500"
                          title="Cancel Order"
                          disabled={updateStatusMutation.isPending}
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-gray-400">No orders found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Detail Modal */}
      {liveSelectedOrder && (
        <OrderDetailModal
          order={liveSelectedOrder}
          onClose={() => setSelectedOrder(null)}
          onStatusChange={(id, status) => updateStatusMutation.mutate({ id, status })}
          onPayment={(order) => { setPaymentOrder(order); setSelectedOrder(null); }}
          onEdit={(order) => { setEditOrder(order); setSelectedOrder(null); }}
          isPending={updateStatusMutation.isPending}
        />
      )}

      {paymentOrder && (
        <OrderPaymentModal
          order={paymentOrder}
          onClose={() => setPaymentOrder(null)}
          onConfirm={(payments) => paymentMutation.mutate({ orderId: paymentOrder.id, payments })}
          onRazorpayVerified={(data) => razorpayVerifyMutation.mutate(data)}
          loading={paymentMutation.isPending || razorpayVerifyMutation.isPending}
        />
      )}

      {editOrder && (
        <OrderEditModal
          order={editOrder}
          onClose={() => setEditOrder(null)}
          onSave={(items) => editItemsMutation.mutate({ orderId: editOrder.id, items })}
          loading={editItemsMutation.isPending}
        />
      )}

      {receiptOrder && (
        <ReceiptModal
          order={receiptOrder}
          onClose={() => setReceiptOrder(null)}
        />
      )}
    </div>
  );
}

function OrderDetailModal({ order, onClose, onStatusChange, onPayment, onEdit, isPending }) {
  const nextStatuses = STATUS_FLOW[order.status] || [];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-lg">{order.order_number}</h2>
            <p className="text-sm text-gray-500 capitalize">
              {order.order_type}{order.table_number ? ` · Table ${order.table_number}` : ''}
              {order.customer_name ? ` · ${order.customer_name}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`${STATUS_COLORS[order.status] || 'badge-gray'} capitalize`}>
              {order.status}
            </span>
            <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
              <XCircle className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2 mb-4">
            {order.items?.map((item, i) => (
              <div key={i} className="flex justify-between items-start py-2 border-b border-gray-50">
                <div>
                  <p className="text-sm font-medium">{item.quantity}× {item.name}</p>
                  {item.variant_name && <p className="text-xs text-gray-500">{item.variant_name}</p>}
                  {item.special_instructions && (
                    <p className="text-xs text-orange-600 italic">Note: {item.special_instructions}</p>
                  )}
                </div>
                <span className="text-sm font-semibold ml-4">₹{(item.unit_price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
            <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>₹{parseFloat(order.subtotal).toFixed(2)}</span></div>
            {parseFloat(order.discount_amount) > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span><span>-₹{parseFloat(order.discount_amount).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between"><span className="text-gray-500">Tax</span><span>₹{parseFloat(order.tax_amount).toFixed(2)}</span></div>
            <div className="flex justify-between font-bold border-t border-gray-200 pt-1 mt-1">
              <span>Total</span><span>₹{parseFloat(order.total_amount).toFixed(2)}</span>
            </div>
          </div>

          {/* Notes */}
          {order.notes && (
            <p className="mt-3 text-xs text-gray-500 bg-yellow-50 border border-yellow-100 rounded-lg p-2">
              📝 {order.notes}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="p-4 border-t border-gray-100 flex gap-2 flex-wrap">
          {!order.is_paid && order.status !== 'cancelled' && (
            <button
              onClick={() => onPayment(order)}
              className="btn btn-sm flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white flex-1"
            >
              <IndianRupee className="w-4 h-4" />
              Collect Payment
            </button>
          )}
          {!order.is_paid && !['completed', 'cancelled'].includes(order.status) && (
            <button
              onClick={() => onEdit(order)}
              className="btn-secondary btn-sm flex items-center gap-1.5"
            >
              <Pencil className="w-4 h-4" />
              Edit Items
            </button>
          )}
          {nextStatuses.filter(s => s !== 'cancelled').map(nextStatus => {
            const cfg = STATUS_LABELS[nextStatus];
            if (!cfg) return null;
            const Icon = cfg.icon;
            return (
              <button
                key={nextStatus}
                onClick={() => { onStatusChange(order.id, nextStatus); }}
                disabled={isPending}
                className="btn btn-primary btn-sm flex-1 flex items-center justify-center gap-1.5"
              >
                <Icon className="w-4 h-4" />
                {cfg.label}
              </button>
            );
          })}
          {nextStatuses.includes('cancelled') && (
            <button
              onClick={() => {
                if (confirm('Cancel this order?')) onStatusChange(order.id, 'cancelled');
              }}
              disabled={isPending}
              className="btn btn-danger btn-sm flex items-center gap-1.5"
            >
              <XCircle className="w-4 h-4" />
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function OrderPaymentModal({ order, onClose, onConfirm, onRazorpayVerified, loading }) {
  const { user } = useSelector(s => s.auth);
  const [method, setMethod] = useState('cash');
  const [cash, setCash] = useState('');
  const [razorpayLoading, setRazorpayLoading] = useState(false);
  const total = parseFloat(order.total_amount);

  const methods = [
    { id: 'cash', label: 'Cash', icon: Banknote },
    { id: 'card', label: 'Card', icon: CreditCard },
    { id: 'mobile', label: 'Mobile', icon: Smartphone },
    { id: 'razorpay', label: 'Pay Online', icon: Wallet }
  ];

  const handleConfirm = () => {
    if (method === 'razorpay') return handleRazorpayPay();
    const pList = method === 'cash'
      ? [{ method: 'cash', amount: parseFloat(cash) || total }]
      : [{ method, amount: total }];
    onConfirm(pList);
  };

  // Opens Razorpay Checkout for the order total, then hands the returned
  // signature off to the backend for verification (see /api/razorpay/verify).
  const handleRazorpayPay = async () => {
    if (typeof window.Razorpay === 'undefined') {
      toast.error('Razorpay checkout failed to load — check your internet connection');
      return;
    }
    setRazorpayLoading(true);
    try {
      const { data } = await razorpayService.createOrder(order.id);
      const rzp = new window.Razorpay({
        key: data.key_id,
        amount: data.amount,
        currency: data.currency,
        name: 'Cafe Billing App',
        description: `Order ${data.order_number}`,
        order_id: data.razorpay_order_id,
        prefill: {
          name: [user?.firstName, user?.lastName].filter(Boolean).join(' '),
          email: user?.email
        },
        theme: { color: '#4338ca' },
        handler: (response) => {
          onRazorpayVerified({
            order_id: order.id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature
          });
        },
        modal: {
          ondismiss: () => setRazorpayLoading(false)
        }
      });
      rzp.on('payment.failed', (response) => {
        toast.error(response.error?.description || 'Payment failed');
        setRazorpayLoading(false);
      });
      rzp.open();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not start Razorpay checkout');
      setRazorpayLoading(false);
    }
  };

  const change = method === 'cash' ? Math.max(0, parseFloat(cash || 0) - total) : 0;
  const confirmDisabled = loading || razorpayLoading || (method === 'cash' && parseFloat(cash || 0) < total);
  const confirmLabel = loading || razorpayLoading
    ? 'Processing...'
    : method === 'razorpay' ? 'Pay with Razorpay' : 'Confirm Payment';

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-xl text-gray-900">Collect Payment</h2>
            <p className="text-sm text-gray-500">{order.order_number}</p>
          </div>
          <button onClick={onClose}>
            <XCircle className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="text-center py-3 bg-green-50 rounded-xl">
            <p className="text-sm text-gray-600">Amount Due</p>
            <p className="text-4xl font-bold text-green-700">{formatCurrency(total)}</p>
          </div>

          <div>
            <p className="label">Payment Method</p>
            <div className="grid grid-cols-2 gap-2">
              {methods.map(m => (
                <button
                  key={m.id}
                  onClick={() => setMethod(m.id)}
                  className={`flex flex-col items-center gap-1 py-3 rounded-xl border-2 transition-colors ${
                    method === m.id
                      ? 'border-green-600 bg-green-50 text-green-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <m.icon className="w-5 h-5" />
                  <span className="text-xs font-medium">{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {method === 'cash' && (
            <div>
              <label className="label">Cash Tendered</label>
              <input
                type="number"
                className="input text-lg font-semibold"
                placeholder={total.toFixed(2)}
                value={cash}
                onChange={e => setCash(e.target.value)}
                min={total}
                step="1"
                autoFocus
              />
              {change > 0 && (
                <p className="mt-2 text-sm font-semibold text-green-700 bg-green-50 rounded-lg px-3 py-2">
                  Change: {formatCurrency(change)}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="p-5 pt-0 flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button
            onClick={handleConfirm}
            disabled={confirmDisabled}
            className="btn flex-1 bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function OrderEditModal({ order, onClose, onSave, loading }) {
  const [lines, setLines] = useState(
    order.items.map(it => ({
      menu_item_id: it.menu_item_id,
      variant_id: it.variant_id || null,
      name: it.name,
      variant_name: it.variant_name,
      quantity: it.quantity,
      unit_price: parseFloat(it.unit_price),
      special_instructions: it.special_instructions || ''
    }))
  );
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');

  const { data: menuItems = [] } = useQuery({
    queryKey: ['menu-items-for-edit', order.location_id],
    queryFn: () => menuService.getItems({ location_id: order.location_id, is_active: true }).then(r => r.data),
    enabled: showAdd
  });

  const { data: taxRates = [] } = useQuery({
    queryKey: ['tax-rates-for-edit', order.location_id],
    queryFn: () => settingsService.getTaxRates({ location_id: order.location_id }).then(r => r.data)
  });

  const updateQty = (idx, delta) => {
    setLines(prev => prev.map((l, i) => i === idx ? { ...l, quantity: Math.max(1, l.quantity + delta) } : l));
  };
  const removeLine = (idx) => setLines(prev => prev.filter((_, i) => i !== idx));

  const addMenuItem = (item, variant) => {
    const menu_item_id = item.id;
    const variant_id = variant?.id || null;
    setLines(prev => {
      const existingIdx = prev.findIndex(l => l.menu_item_id === menu_item_id && l.variant_id === variant_id);
      if (existingIdx >= 0) {
        return prev.map((l, i) => i === existingIdx ? { ...l, quantity: l.quantity + 1 } : l);
      }
      const unit_price = parseFloat(item.base_price) + (variant ? parseFloat(variant.price_modifier || 0) : 0);
      return [...prev, {
        menu_item_id, variant_id, name: item.name, variant_name: variant?.name,
        quantity: 1, unit_price, special_instructions: ''
      }];
    });
  };

  // Live preview only — the backend always recalculates from current menu
  // prices and tax rates when the save actually happens, so this is just to
  // show the cashier roughly what the new total will be.
  const subtotal = lines.reduce((sum, l) => sum + l.unit_price * l.quantity, 0);
  const existingDiscount = Math.min(parseFloat(order.discount_amount) || 0, subtotal);
  const taxableAmount = subtotal - existingDiscount;
  const taxAmount = taxRates
    .filter(t => t.is_active)
    .reduce((sum, t) => sum + taxableAmount * (parseFloat(t.tax_percentage) / 100), 0);
  const total = taxableAmount + taxAmount;

  const handleSave = () => {
    if (lines.length === 0) {
      toast.error('Order must have at least one item — cancel the order instead if it should be removed entirely');
      return;
    }
    onSave(lines.map(l => ({
      menu_item_id: l.menu_item_id,
      variant_id: l.variant_id,
      quantity: l.quantity,
      special_instructions: l.special_instructions || undefined
    })));
  };

  const filteredMenuItems = menuItems.filter(m =>
    !search || m.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[85vh] flex flex-col">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-xl text-gray-900">Edit Order</h2>
            <p className="text-sm text-gray-500">{order.order_number}</p>
          </div>
          <button onClick={onClose}>
            <XCircle className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-5 flex-1 overflow-y-auto space-y-3">
          {lines.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-6">
              No items left — add something below, or close this and cancel the order instead.
            </p>
          )}
          {lines.map((l, idx) => (
            <div key={`${l.menu_item_id}-${l.variant_id}-${idx}`} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">
                  {l.name}{l.variant_name ? ` (${l.variant_name})` : ''}
                </p>
                <p className="text-xs text-gray-500">{formatCurrency(l.unit_price)} each</p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => updateQty(idx, -1)} className="p-1 rounded hover:bg-gray-200">
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-6 text-center font-semibold">{l.quantity}</span>
                <button onClick={() => updateQty(idx, 1)} className="p-1 rounded hover:bg-gray-200">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <p className="w-16 text-right font-semibold text-sm">{formatCurrency(l.unit_price * l.quantity)}</p>
              <button onClick={() => removeLine(idx)} className="p-1.5 rounded hover:bg-red-50 text-red-500">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          {!showAdd ? (
            <button onClick={() => setShowAdd(true)} className="btn-secondary btn-sm w-full flex items-center justify-center gap-1.5">
              <Plus className="w-4 h-4" /> Add Item
            </button>
          ) : (
            <div className="border border-gray-200 rounded-xl p-3 space-y-2">
              <input
                type="text"
                className="input"
                placeholder="Search menu..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                autoFocus
              />
              <div className="max-h-48 overflow-y-auto space-y-1">
                {filteredMenuItems.map(item => (
                  <div key={item.id}>
                    {(item.variants?.length ? item.variants : [null]).map((variant, vIdx) => (
                      <button
                        key={variant?.id || `${item.id}-base-${vIdx}`}
                        onClick={() => addMenuItem(item, variant)}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-orange-50 text-left"
                      >
                        <span className="text-sm">{item.name}{variant ? ` (${variant.name})` : ''}</span>
                        <span className="text-sm font-semibold text-gray-600">
                          {formatCurrency(parseFloat(item.base_price) + parseFloat(variant?.price_modifier || 0))}
                        </span>
                      </button>
                    ))}
                  </div>
                ))}
                {filteredMenuItems.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-3">No matching items</p>
                )}
              </div>
              <button onClick={() => setShowAdd(false)} className="text-sm text-gray-500 hover:text-gray-700">
                Done adding
              </button>
            </div>
          )}
        </div>

        <div className="p-5 border-t border-gray-100 space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Subtotal</span><span>{formatCurrency(subtotal)}</span>
          </div>
          {existingDiscount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Discount</span><span>-{formatCurrency(existingDiscount)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm text-gray-600">
            <span>Tax</span><span>{formatCurrency(taxAmount)}</span>
          </div>
          <div className="flex justify-between font-bold text-gray-900 text-lg pt-1 border-t border-gray-100">
            <span>New Total</span><span>{formatCurrency(total)}</span>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button
              onClick={handleSave}
              disabled={loading || lines.length === 0}
              className="btn flex-1 bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
