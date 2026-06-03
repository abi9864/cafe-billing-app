import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { RefreshCw, Search, Eye, CheckCircle2, XCircle, ChefHat, Clock } from 'lucide-react';
import { orderService } from '../services';

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
  preparing: ['ready'],
  ready: ['completed'],
  completed: [],
  cancelled: []
};

export default function OrdersPage() {
  const { user } = useSelector(s => s.auth);
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);

  const { data: orders = [], isFetching, refetch } = useQuery({
    queryKey: ['orders', user?.locationId, statusFilter],
    queryFn: () => orderService.getOrders({
      location_id: user?.locationId,
      status: statusFilter || undefined,
      limit: 50
    }).then(r => r.data),
    refetchInterval: 30000
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => orderService.updateStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries(['orders']);
      toast.success('Order status updated');
    },
    onError: () => toast.error('Failed to update status')
  });

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
                        title="View"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {STATUS_FLOW[order.status]?.includes('confirmed') && (
                        <button
                          onClick={() => updateStatusMutation.mutate({ id: order.id, status: 'confirmed' })}
                          className="p-1.5 rounded hover:bg-green-50 text-green-600"
                          title="Confirm"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      )}
                      {STATUS_FLOW[order.status]?.includes('preparing') && (
                        <button
                          onClick={() => updateStatusMutation.mutate({ id: order.id, status: 'preparing' })}
                          className="p-1.5 rounded hover:bg-orange-50 text-orange-500"
                          title="Start Preparing"
                        >
                          <ChefHat className="w-4 h-4" />
                        </button>
                      )}
                      {STATUS_FLOW[order.status]?.includes('ready') && (
                        <button
                          onClick={() => updateStatusMutation.mutate({ id: order.id, status: 'ready' })}
                          className="p-1.5 rounded hover:bg-green-50 text-green-600"
                          title="Mark Ready"
                        >
                          <Clock className="w-4 h-4" />
                        </button>
                      )}
                      {STATUS_FLOW[order.status]?.includes('cancelled') && (
                        <button
                          onClick={() => {
                            if (confirm('Cancel this order?')) {
                              updateStatusMutation.mutate({ id: order.id, status: 'cancelled' });
                            }
                          }}
                          className="p-1.5 rounded hover:bg-red-50 text-red-500"
                          title="Cancel"
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
      {selectedOrder && (
        <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
      )}
    </div>
  );
}

function OrderDetailModal({ order, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl max-h-[80vh] flex flex-col">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-lg">{order.order_number}</h2>
            <p className="text-sm text-gray-500 capitalize">{order.order_type}
              {order.table_number ? ` · Table ${order.table_number}` : ''}
            </p>
          </div>
          <button onClick={onClose}><XCircle className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2 mb-4">
            {order.items?.map((item, i) => (
              <div key={i} className="flex justify-between items-center py-2 border-b border-gray-50">
                <div>
                  <p className="text-sm font-medium">{item.quantity}× {item.name}</p>
                  {item.variant_name && <p className="text-xs text-gray-500">{item.variant_name}</p>}
                  {item.special_instructions && (
                    <p className="text-xs text-orange-600 italic">Note: {item.special_instructions}</p>
                  )}
                </div>
                <span className="text-sm font-semibold">₹{(item.unit_price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
            <div className="flex justify-between"><span>Subtotal</span><span>₹{parseFloat(order.subtotal).toFixed(2)}</span></div>
            {parseFloat(order.discount_amount) > 0 && (
              <div className="flex justify-between text-green-600"><span>Discount</span><span>-₹{parseFloat(order.discount_amount).toFixed(2)}</span></div>
            )}
            <div className="flex justify-between"><span>Tax</span><span>₹{parseFloat(order.tax_amount).toFixed(2)}</span></div>
            <div className="flex justify-between font-bold border-t border-gray-200 pt-1">
              <span>Total</span><span>₹{parseFloat(order.total_amount).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
