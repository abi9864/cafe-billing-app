import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Download } from 'lucide-react';
import { reportService } from '../services';
import { formatCurrency } from '../utils/calculations';
import { downloadCSV } from '../utils/csv';
import { format, subDays } from 'date-fns';

const COLORS = ['#0d9488', '#4338ca', '#0b1f1c', '#5eead4', '#c7d2fe'];

// Razorpay reports the specific method used (upi, card, netbanking, wallet,
// emi) alongside the manual cash/card/mobile entries — this gives each a
// readable label instead of relying on plain CSS capitalization.
const PAYMENT_METHOD_LABELS = {
  cash: 'Cash',
  card: 'Card',
  mobile: 'Mobile',
  upi: 'UPI',
  netbanking: 'Net Banking',
  wallet: 'Wallet',
  emi: 'EMI',
  mixed: 'Mixed'
};
const paymentMethodLabel = (method) => PAYMENT_METHOD_LABELS[method] || (method ? method.charAt(0).toUpperCase() + method.slice(1) : 'Unknown');

export default function ReportsPage() {
  const { user } = useSelector(s => s.auth);
  const locId = user?.locationId;

  const [activeTab, setActiveTab] = useState('sales');
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 29), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [groupBy, setGroupBy] = useState('day');

  const params = { location_id: locId, date_from: dateFrom, date_to: dateTo };

  const { data: salesReport } = useQuery({
    queryKey: ['report-sales', locId, dateFrom, dateTo, groupBy],
    queryFn: () => reportService.getSales({ ...params, group_by: groupBy }).then(r => r.data),
    enabled: activeTab === 'sales'
  });

  const { data: topItems = [] } = useQuery({
    queryKey: ['report-top', locId, dateFrom, dateTo],
    queryFn: () => reportService.getTopItems({ ...params, limit: 10 }).then(r => r.data),
    enabled: activeTab === 'sales'
  });

  const { data: taxReport = [] } = useQuery({
    queryKey: ['report-tax', locId, dateFrom, dateTo],
    queryFn: () => reportService.getTax(params).then(r => r.data),
    enabled: activeTab === 'tax'
  });

  const { data: inventoryReport = [] } = useQuery({
    queryKey: ['report-inventory', locId],
    queryFn: () => reportService.getInventory({ location_id: locId }).then(r => r.data),
    enabled: activeTab === 'inventory'
  });

  const { data: paymentTrends = [] } = useQuery({
    queryKey: ['report-payments', locId, dateFrom, dateTo],
    queryFn: () => reportService.getPaymentTrends(params).then(r => r.data),
    enabled: activeTab === 'sales'
  });

  const summary = salesReport?.summary || {};

  const handleExport = () => {
    if (activeTab === 'sales') {
      downloadCSV(
        `sales-report_${dateFrom}_to_${dateTo}.csv`,
        ['Period', 'Orders', 'Subtotal', 'Tax', 'Discount', 'Revenue'],
        (salesReport?.data || []).map(r => [
          r.period, r.order_count, r.subtotal, r.tax_amount, r.discount_amount, r.total_revenue
        ])
      );
    } else if (activeTab === 'tax') {
      downloadCSV(
        `tax-report_${dateFrom}_to_${dateTo}.csv`,
        ['Month', 'Orders', 'Subtotal', 'Tax Collected', 'Total Revenue'],
        taxReport.map(r => [
          format(new Date(r.month), 'MMMM yyyy'), r.total_orders, r.total_subtotal, r.total_tax, r.total_revenue
        ])
      );
    } else if (activeTab === 'inventory') {
      downloadCSV(
        `inventory-report_${format(new Date(), 'yyyy-MM-dd')}.csv`,
        ['Item', 'Qty on Hand', 'Unit', 'Reorder Level', 'Supplier', 'Status'],
        inventoryReport.map(item => [
          item.item_name, item.quantity_on_hand, item.unit_of_measure || '',
          item.reorder_level ?? '', item.supplier_name || '', item.is_low_stock ? 'Low Stock' : 'OK'
        ])
      );
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Reports</h1>

      {/* Date Filters */}
      <div className="card p-4 flex flex-wrap gap-4 items-center">
        <div className="flex gap-2 items-center">
          <label className="text-sm text-gray-600">From:</label>
          <input type="date" className="input w-40" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        </div>
        <div className="flex gap-2 items-center">
          <label className="text-sm text-gray-600">To:</label>
          <input type="date" className="input w-40" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        </div>
        <div className="flex gap-2 items-center">
          <label className="text-sm text-gray-600">Group by:</label>
          <select className="input w-28" value={groupBy} onChange={e => setGroupBy(e.target.value)}>
            <option value="day">Day</option>
            <option value="week">Week</option>
            <option value="month">Month</option>
          </select>
        </div>
        {/* Quick ranges */}
        <div className="flex gap-2 ml-auto">
          {[
            { label: '7d', days: 7 },
            { label: '30d', days: 30 },
            { label: '90d', days: 90 }
          ].map(r => (
            <button
              key={r.days}
              onClick={() => {
                setDateFrom(format(subDays(new Date(), r.days - 1), 'yyyy-MM-dd'));
                setDateTo(format(new Date(), 'yyyy-MM-dd'));
              }}
              className="btn-secondary btn-sm"
            >
              Last {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-gray-200">
        <div className="flex">
          {['sales', 'tax', 'inventory'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px transition-colors ${
                      activeTab === tab ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}>
              {tab}
            </button>
          ))}
        </div>
        <button onClick={handleExport} className="btn-secondary btn-sm mb-1.5">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {activeTab === 'sales' && (
        <div className="space-y-4">
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Orders', value: summary.total_orders || 0 },
              { label: 'Total Revenue', value: formatCurrency(summary.total_revenue || 0) },
              { label: 'Avg Order Value', value: formatCurrency(summary.avg_order_value || 0) },
              { label: 'Total Tax Collected', value: formatCurrency(summary.total_tax || 0) }
            ].map((k, i) => (
              <div key={i} className="card p-4 text-center">
                <p className="text-sm text-gray-500">{k.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{k.value}</p>
              </div>
            ))}
          </div>

          {/* Sales Chart */}
          <div className="card p-5">
            <h2 className="font-semibold text-gray-800 mb-4">Revenue Over Time</h2>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={salesReport?.data || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${v}`} />
                <Tooltip formatter={(v) => [`₹${parseFloat(v).toFixed(2)}`]} />
                <Bar dataKey="total_revenue" fill="#0d9488" radius={[4, 4, 0, 0]} name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {/* Top Items */}
            <div className="card p-5">
              <h2 className="font-semibold text-gray-800 mb-4">Top Items by Quantity</h2>
              {topItems.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={topItems} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={100} />
                    <Tooltip />
                    <Bar dataKey="total_quantity" fill="#4338ca" radius={[0, 4, 4, 0]} name="Qty Sold" />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-gray-400 text-sm py-8 text-center">No data</p>}
            </div>

            {/* Payment Methods Pie */}
            <div className="card p-5">
              <h2 className="font-semibold text-gray-800 mb-4">Payment Methods</h2>
              {paymentTrends.length > 0 ? (
                <div className="flex items-center gap-4">
                  <PieChart width={180} height={180}>
                    <Pie data={paymentTrends} dataKey="count" cx={90} cy={90} outerRadius={70}>
                      {paymentTrends.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v, n, p) => [v, paymentMethodLabel(p.payload.payment_method)]} />
                  </PieChart>
                  <div className="space-y-2">
                    {paymentTrends.map((pt, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <div className="w-3 h-3 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                        <span className="text-gray-700">{paymentMethodLabel(pt.payment_method)}</span>
                        <span className="font-semibold ml-auto pl-4">{pt.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : <p className="text-gray-400 text-sm py-8 text-center">No data</p>}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'tax' && (
        <div className="space-y-4">
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Month</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Orders</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Subtotal</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Tax Collected</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Total Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {taxReport.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium">{format(new Date(row.month), 'MMMM yyyy')}</td>
                    <td className="px-4 py-3 text-right">{row.total_orders}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(row.total_subtotal)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-orange-700">{formatCurrency(row.total_tax)}</td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900">{formatCurrency(row.total_revenue)}</td>
                  </tr>
                ))}
                {taxReport.length === 0 && (
                  <tr><td colSpan={5} className="text-center py-8 text-gray-400">No tax data for selected period</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'inventory' && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Item</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Qty on Hand</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Unit</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Reorder Level</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Supplier</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {inventoryReport.map(item => (
                <tr key={item.id} className={`hover:bg-gray-50/50 ${item.is_low_stock ? 'bg-red-50/20' : ''}`}>
                  <td className="px-4 py-3 font-medium text-gray-900">{item.item_name}</td>
                  <td className={`px-4 py-3 text-right font-semibold ${item.is_low_stock ? 'text-red-600' : 'text-gray-900'}`}>
                    {parseFloat(item.quantity_on_hand).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{item.unit_of_measure || '—'}</td>
                  <td className="px-4 py-3 text-right text-gray-500">{item.reorder_level ? parseFloat(item.reorder_level).toFixed(2) : '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{item.supplier_name || '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={item.is_low_stock ? 'badge-red' : 'badge-green'}>
                      {item.is_low_stock ? 'Low Stock' : 'OK'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
