import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { Plus, AlertTriangle, TrendingDown, Package, X, History } from 'lucide-react';
import { inventoryService } from '../services';
import { format } from 'date-fns';

export default function InventoryPage() {
  const { user } = useSelector(s => s.auth);
  const locId = user?.locationId;
  const qc = useQueryClient();

  const [showLowStock, setShowLowStock] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [adjustItem, setAdjustItem] = useState(null);
  const [historyItem, setHistoryItem] = useState(null);

  const { data: items = [] } = useQuery({
    queryKey: ['inventory', locId, showLowStock],
    queryFn: () => inventoryService.getItems({ location_id: locId, low_stock: showLowStock }).then(r => r.data)
  });

  const { data: history = [] } = useQuery({
    queryKey: ['inventory-history', historyItem?.id],
    queryFn: () => inventoryService.getHistory(historyItem.id).then(r => r.data),
    enabled: !!historyItem
  });

  const lowStockCount = items.filter(i => i.reorder_level && parseFloat(i.quantity_on_hand) <= parseFloat(i.reorder_level)).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
          {lowStockCount > 0 && (
            <p className="text-sm text-red-600 flex items-center gap-1 mt-0.5">
              <AlertTriangle className="w-4 h-4" /> {lowStockCount} items need restocking
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input type="checkbox" checked={showLowStock}
                   onChange={e => setShowLowStock(e.target.checked)} />
            Low stock only
          </label>
          <button onClick={() => setShowAddModal(true)} className="btn-primary btn-sm">
            <Plus className="w-4 h-4" /> Add Item
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Item Name</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-600">Qty on Hand</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Unit</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-600">Reorder Level</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Supplier</th>
              <th className="text-center px-4 py-3 font-semibold text-gray-600">Status</th>
              <th className="text-center px-4 py-3 font-semibold text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {items.map(item => {
              const isLow = item.reorder_level && parseFloat(item.quantity_on_hand) <= parseFloat(item.reorder_level);
              return (
                <tr key={item.id} className={`hover:bg-gray-50/50 ${isLow ? 'bg-red-50/30' : ''}`}>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    <div className="flex items-center gap-2">
                      {isLow && <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />}
                      {item.item_name}
                    </div>
                  </td>
                  <td className={`px-4 py-3 text-right font-semibold ${isLow ? 'text-red-600' : 'text-gray-900'}`}>
                    {parseFloat(item.quantity_on_hand).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{item.unit_of_measure || '—'}</td>
                  <td className="px-4 py-3 text-right text-gray-500">
                    {item.reorder_level ? parseFloat(item.reorder_level).toFixed(2) : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{item.supplier_name || '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={isLow ? 'badge-red' : 'badge-green'}>
                      {isLow ? 'Low Stock' : 'OK'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex gap-1 justify-center">
                      <button onClick={() => setAdjustItem(item)}
                              className="p-1.5 rounded hover:bg-primary-50 text-primary-600"
                              title="Adjust Stock">
                        <Package className="w-4 h-4" />
                      </button>
                      <button onClick={() => setHistoryItem(item)}
                              className="p-1.5 rounded hover:bg-blue-50 text-blue-600"
                              title="History">
                        <History className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr><td colSpan={7} className="text-center py-8 text-gray-400">No inventory items found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <AddInventoryModal locationId={locId} onClose={() => setShowAddModal(false)}
                           onSuccess={() => { setShowAddModal(false); qc.invalidateQueries(['inventory']); }} />
      )}

      {adjustItem && (
        <AdjustStockModal item={adjustItem} onClose={() => setAdjustItem(null)}
                          onSuccess={() => { setAdjustItem(null); qc.invalidateQueries(['inventory']); }} />
      )}

      {historyItem && (
        <HistoryModal item={historyItem} history={history} onClose={() => setHistoryItem(null)} />
      )}
    </div>
  );
}

function AddInventoryModal({ locationId, onClose, onSuccess }) {
  const [form, setForm] = useState({ item_name: '', quantity_on_hand: 0, unit_of_measure: '', reorder_level: '', reorder_quantity: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await inventoryService.createItem({ ...form, location_id: locationId });
      toast.success('Inventory item added');
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add item');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-bold text-lg">Add Inventory Item</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div><label className="label">Item Name *</label>
            <input className="input" required value={form.item_name} onChange={e => setForm(f => ({...f, item_name: e.target.value}))} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Quantity</label>
              <input type="number" className="input" min="0" step="0.01" value={form.quantity_on_hand} onChange={e => setForm(f => ({...f, quantity_on_hand: e.target.value}))} /></div>
            <div><label className="label">Unit</label>
              <input className="input" placeholder="kg, liters..." value={form.unit_of_measure} onChange={e => setForm(f => ({...f, unit_of_measure: e.target.value}))} /></div>
            <div><label className="label">Reorder Level</label>
              <input type="number" className="input" min="0" step="0.01" value={form.reorder_level} onChange={e => setForm(f => ({...f, reorder_level: e.target.value}))} /></div>
            <div><label className="label">Reorder Qty</label>
              <input type="number" className="input" min="0" step="0.01" value={form.reorder_quantity} onChange={e => setForm(f => ({...f, reorder_quantity: e.target.value}))} /></div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">{loading ? 'Adding...' : 'Add Item'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AdjustStockModal({ item, onClose, onSuccess }) {
  const [form, setForm] = useState({ transaction_type: 'in', quantity: '', notes: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await inventoryService.adjustStock(item.id, form);
      toast.success('Stock adjusted');
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to adjust stock');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="p-4 border-b flex items-center justify-between">
          <div>
            <h2 className="font-bold text-lg">Adjust Stock</h2>
            <p className="text-sm text-gray-500">{item.item_name} · Current: {parseFloat(item.quantity_on_hand).toFixed(2)} {item.unit_of_measure}</p>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div>
            <label className="label">Transaction Type</label>
            <div className="grid grid-cols-3 gap-2">
              {[{v:'in',l:'Stock In'},{v:'out',l:'Stock Out'},{v:'adjustment',l:'Adjust'}].map(t => (
                <button type="button" key={t.v}
                        onClick={() => setForm(f => ({...f, transaction_type: t.v}))}
                        className={`py-2 rounded-lg text-sm font-medium transition-colors border-2 ${form.transaction_type === t.v ? 'border-primary-600 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-600'}`}>
                  {t.l}
                </button>
              ))}
            </div>
          </div>
          <div><label className="label">Quantity *</label>
            <input type="number" className="input" required min="0.01" step="0.01" value={form.quantity}
                   onChange={e => setForm(f => ({...f, quantity: e.target.value}))} /></div>
          <div><label className="label">Notes</label>
            <input className="input" placeholder="Reason for adjustment..." value={form.notes}
                   onChange={e => setForm(f => ({...f, notes: e.target.value}))} /></div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">{loading ? 'Saving...' : 'Save Adjustment'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function HistoryModal({ item, history, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl max-h-[80vh] flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <div>
            <h2 className="font-bold text-lg">Stock History</h2>
            <p className="text-sm text-gray-500">{item.item_name}</p>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {history.length === 0 ? (
            <p className="text-center text-gray-400 py-8">No transaction history</p>
          ) : (
            <div className="space-y-2">
              {history.map(t => (
                <div key={t.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    t.transaction_type === 'in' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {t.transaction_type === 'in' ? '+' : '-'}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium capitalize">{t.transaction_type}</p>
                    <p className="text-xs text-gray-500">{t.notes || 'No notes'} · {t.created_by_name}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${t.transaction_type === 'in' ? 'text-green-600' : 'text-red-600'}`}>
                      {t.transaction_type === 'in' ? '+' : '-'}{parseFloat(t.quantity).toFixed(2)} {item.unit_of_measure}
                    </p>
                    <p className="text-xs text-gray-400">{format(new Date(t.created_at), 'dd/MM HH:mm')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
