import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { ShoppingBag, TrendingUp, Package, AlertTriangle, ArrowUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { reportService } from '../services';
import { formatCurrency } from '../utils/calculations';

export default function AdminDashboard() {
  const { user } = useSelector(s => s.auth);
  const locId = user?.locationId;

  const { data: kpis } = useQuery({
    queryKey: ['kpis', locId],
    queryFn: () => reportService.getDashboardKPIs({ location_id: locId }).then(r => r.data),
    refetchInterval: 30000
  });

  const { data: salesData } = useQuery({
    queryKey: ['sales-week', locId],
    queryFn: () => reportService.getSales({
      location_id: locId,
      date_from: new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10),
      date_to: new Date().toISOString().slice(0, 10),
      group_by: 'day'
    }).then(r => r.data.data),
    refetchInterval: 30000
  });

  const { data: topItems = [] } = useQuery({
    queryKey: ['top-items', locId],
    queryFn: () => reportService.getTopItems({ location_id: locId, limit: 6,
      date_from: new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
    }).then(r => r.data),
    refetchInterval: 30000
  });

  const { data: paymentTrends = [] } = useQuery({
    queryKey: ['payment-trends', locId],
    queryFn: () => reportService.getPaymentTrends({ location_id: locId }).then(r => r.data),
    refetchInterval: 30000
  });

  const kpiCards = [
    {
      label: "Today's Orders",
      value: kpis?.today?.orders || 0,
      sub: `${formatCurrency(kpis?.today?.revenue || 0)} revenue`,
      icon: ShoppingBag,
      color: 'bg-blue-500'
    },
    {
      label: 'Weekly Revenue',
      value: formatCurrency(kpis?.week?.revenue || 0),
      sub: `${kpis?.week?.orders || 0} orders this week`,
      icon: TrendingUp,
      color: 'bg-green-500'
    },
    {
      label: 'Active Orders',
      value: kpis?.active_orders || 0,
      sub: 'Currently in progress',
      icon: ArrowUp,
      color: 'bg-orange-500'
    },
    {
      label: 'Low Stock Items',
      value: kpis?.low_stock_count || 0,
      sub: 'Need restocking',
      icon: AlertTriangle,
      color: kpis?.low_stock_count > 0 ? 'bg-red-500' : 'bg-gray-400'
    }
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpiCards.map((card, i) => (
          <div key={i} className="card p-5">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 ${card.color} rounded-xl flex items-center justify-center shrink-0`}>
                <card.icon className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{card.label}</p>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                <p className="text-xs text-gray-500">{card.sub}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Weekly Sales */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Weekly Sales</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={salesData || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="period" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${v}`} />
              <Tooltip formatter={(v) => [`₹${parseFloat(v).toFixed(2)}`, 'Revenue']} />
              <Bar dataKey="total_revenue" fill="#0d9488" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Items */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Top Selling Items (30 days)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={topItems} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={90} />
              <Tooltip formatter={(v) => [v, 'Qty Sold']} />
              <Bar dataKey="total_quantity" fill="#4338ca" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Payment Methods */}
      <div className="card p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Payment Methods Breakdown</h2>
        <div className="flex gap-4 flex-wrap">
          {paymentTrends.map(pt => (
            <div key={pt.payment_method} className="flex-1 min-w-32 bg-gray-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{pt.count}</p>
              <p className="text-sm text-gray-600 capitalize mt-1">{pt.payment_method || 'N/A'}</p>
              <p className="text-xs text-primary-700 font-medium">{formatCurrency(pt.total)}</p>
            </div>
          ))}
          {paymentTrends.length === 0 && (
            <p className="text-gray-400 text-sm py-4">No payment data yet</p>
          )}
        </div>
      </div>

      {/* Top Item Today */}
      {kpis?.top_item_today && (
        <div className="card p-5 bg-primary-50 border-primary-100">
          <p className="text-sm text-primary-700 font-medium">⭐ Top Item Today</p>
          <p className="text-xl font-bold text-gray-900">{kpis.top_item_today.name}</p>
          <p className="text-sm text-gray-600">{kpis.top_item_today.qty} units sold</p>
        </div>
      )}
    </div>
  );
}
