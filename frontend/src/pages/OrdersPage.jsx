import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { RefreshCw, Search, Eye, CheckCircle2, XCircle, ChefHat, Clock, IndianRupee, Banknote, CreditCard, Smartphone } from 'lucide-react';
import { orderService, paymentService } from '../services';
import { formatCurrency } from '../utils/calculations';

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

  const { data: orders = [], isFetching, refetch } = useQuery({
    queryKey: ['orders', user?.locationId, statusFilter],
    queryFn: () => orderService.getOrders({
      location_id: user?.locationId,
      status: statusFilter || undefined,
      limit: 50
    }).then(r => r.data),
    refetchInterval: 30000
  });

  const paymentMutation = useMutation({
    mutationFn: ({ orderId, payments }) => paymentService.processPayment({ order_id: orderId, payments }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['kpis'] });
      qc.invalidateQueries({ queryKey: ['sales-week'] });
      qc.invalidateQueries({ queryKey: ['top-items'] });
      qc.invalidateQueries({ queryKey: ['payment-trends'] });
      setPaymentOrder(null);
      toast.success('Payment recorded successfully');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Payment failed')
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
          isPending={updateStatusMutation.isPending}
        />
      )}

      {paymentOrder && (
        <OrderPaymentModal
          order={paymentOrder}
          onClose={() => setPaymentOrder(null)}
          onConfirm={(payments) => paymentMutation.mutate({ orderId: paymentOrder.id, payments })}
          loading={paymentMutation.isPending}
        />
      )}
    </div>
  );
}

function OrderDetailModal({ order, onClose, onStatusChange, onPayment, isPending }) {
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

function OrderPaymentModal({ order, onClose, onConfirm, loading }) {
  const [method, setMethod] = useState('cash');
  const [cash, setCash] = useState('');
  const total = parseFloat(order.total_amount);

  const methods = [
    { id: 'cash', label: 'Cash', icon: Banknote },
    { id: 'card', label: 'Card', icon: CreditCard },
    { id: 'mobile', label: 'Mobile', icon: Smartphone }
  ];

  const handleConfirm = () => {
    const pList = method === 'cash'
      ? [{ method: 'cash', amount: parseFloat(cash) || total }]
      : [{ method, amount: total }];
    onConfirm(pList);
  };

  const change = method === 'cash' ? Math.max(0, parseFloat(cash || 0) - total) : 0;

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
            <div className="grid grid-cols-3 gap-2">
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
            disabled={loading || (method === 'cash' && parseFloat(cash || 0) < total)}
            className="btn flex-1 bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Confirm Payment'}
          </button>
        </div>
      </div>
    </div>
  );
}
