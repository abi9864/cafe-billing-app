import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { Plus, Trash2, X, Save } from 'lucide-react';
import { settingsService, discountService } from '../services';

export default function SettingsPage() {
  const { user } = useSelector(s => s.auth);
  const locId = user?.locationId;
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState('general');

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      <div className="flex border-b border-gray-200">
        {['general', 'tax', 'discounts'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px transition-colors ${
                    activeTab === tab ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}>
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'general' && <GeneralSettings locId={locId} qc={qc} />}
      {activeTab === 'tax' && <TaxSettings locId={locId} qc={qc} />}
      {activeTab === 'discounts' && <DiscountSettings locId={locId} qc={qc} />}
    </div>
  );
}

function GeneralSettings({ locId, qc }) {
  const { data: settings } = useQuery({
    queryKey: ['settings', locId],
    queryFn: () => settingsService.getSettings({ location_id: locId }).then(r => r.data)
  });

  const [form, setForm] = useState({});
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    try {
      await settingsService.updateSettings({ location_id: locId, settings: form });
      qc.invalidateQueries(['settings']);
      toast.success('Settings saved');
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch { toast.error('Failed to save settings'); }
  };

  const getValue = (key) => form[key] !== undefined ? form[key] : (settings?.[key] || '');
  const setValue = (key, value) => setForm(f => ({...f, [key]: value}));

  return (
    <div className="card p-6 space-y-5 max-w-lg">
      <div><label className="label">App Name</label>
        <input className="input" value={getValue('app_name')} onChange={e => setValue('app_name', e.target.value)} /></div>
      <div><label className="label">Currency Symbol</label>
        <input className="input w-24" value={getValue('currency_symbol')} onChange={e => setValue('currency_symbol', e.target.value)} /></div>
      <div><label className="label">Receipt Footer Text</label>
        <textarea className="input" rows={3} value={getValue('receipt_footer')} onChange={e => setValue('receipt_footer', e.target.value)} /></div>
      <div><label className="label">Loyalty Points per ₹1 spent</label>
        <input type="number" className="input w-32" min="0" step="0.1" value={getValue('loyalty_points_per_rupee')} onChange={e => setValue('loyalty_points_per_rupee', e.target.value)} /></div>
      <div><label className="label">Value per Loyalty Point (₹)</label>
        <input type="number" className="input w-32" min="0" step="0.01" value={getValue('loyalty_rupees_per_point')} onChange={e => setValue('loyalty_rupees_per_point', e.target.value)} /></div>
      <button onClick={handleSave} className="btn-primary">
        <Save className="w-4 h-4" /> {saved ? 'Saved!' : 'Save Settings'}
      </button>
    </div>
  );
}

function TaxSettings({ locId, qc }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ tax_name: '', tax_percentage: '' });

  const { data: taxRates = [] } = useQuery({
    queryKey: ['taxRates', locId],
    queryFn: () => settingsService.getTaxRates({ location_id: locId }).then(r => r.data)
  });

  const createMutation = useMutation({
    mutationFn: (data) => settingsService.createTaxRate({ ...data, location_id: locId }),
    onSuccess: () => { qc.invalidateQueries(['taxRates']); setShowAdd(false); setForm({ tax_name: '', tax_percentage: '' }); toast.success('Tax rate added'); }
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }) => settingsService.updateTaxRate(id, { is_active }),
    onSuccess: () => qc.invalidateQueries(['taxRates'])
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => settingsService.deleteTaxRate(id),
    onSuccess: () => { qc.invalidateQueries(['taxRates']); toast.success('Tax rate removed'); }
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">Configure tax rates for this location</p>
        <button onClick={() => setShowAdd(true)} className="btn-primary btn-sm">
          <Plus className="w-4 h-4" /> Add Tax Rate
        </button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Tax Name</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-600">Rate (%)</th>
              <th className="text-center px-4 py-3 font-semibold text-gray-600">Status</th>
              <th className="text-center px-4 py-3 font-semibold text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {taxRates.map(tax => (
              <tr key={tax.id} className="hover:bg-gray-50/50">
                <td className="px-4 py-3 font-medium text-gray-900">{tax.tax_name}</td>
                <td className="px-4 py-3 text-right font-semibold text-primary-700">{tax.tax_percentage}%</td>
                <td className="px-4 py-3 text-center">
                  <button onClick={() => toggleMutation.mutate({ id: tax.id, is_active: !tax.is_active })}
                          className={tax.is_active ? 'badge-green cursor-pointer' : 'badge-red cursor-pointer'}>
                    {tax.is_active ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td className="px-4 py-3 text-center">
                  <button onClick={() => { if(confirm('Delete?')) deleteMutation.mutate(tax.id); }}
                          className="p-1.5 rounded hover:bg-red-50 text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {taxRates.length === 0 && (
              <tr><td colSpan={4} className="text-center py-8 text-gray-400">No tax rates configured</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="font-bold text-lg">Add Tax Rate</h2>
              <button onClick={() => setShowAdd(false)}><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-4 space-y-3">
              <div><label className="label">Tax Name *</label>
                <input className="input" placeholder="e.g. GST, VAT" value={form.tax_name}
                       onChange={e => setForm(f => ({...f, tax_name: e.target.value}))} /></div>
              <div><label className="label">Rate (%) *</label>
                <input type="number" className="input" min="0" max="100" step="0.01" value={form.tax_percentage}
                       onChange={e => setForm(f => ({...f, tax_percentage: e.target.value}))} /></div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowAdd(false)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending}
                        className="btn-primary flex-1">Add</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DiscountSettings({ locId, qc }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ discount_code: '', discount_name: '', discount_type: 'percentage', discount_value: '', applicable_to: 'order' });

  const { data: discounts = [] } = useQuery({
    queryKey: ['discounts', locId],
    queryFn: () => discountService.getDiscounts({ location_id: locId }).then(r => r.data)
  });

  const createMutation = useMutation({
    mutationFn: (data) => discountService.createDiscount({ ...data, location_id: locId }),
    onSuccess: () => { qc.invalidateQueries(['discounts']); setShowAdd(false); toast.success('Discount created'); }
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }) => discountService.updateDiscount(id, { is_active }),
    onSuccess: () => qc.invalidateQueries(['discounts'])
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">Manage promotional codes and discounts</p>
        <button onClick={() => setShowAdd(true)} className="btn-primary btn-sm">
          <Plus className="w-4 h-4" /> Create Discount
        </button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Code</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Name</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Type</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-600">Value</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-600">Used</th>
              <th className="text-center px-4 py-3 font-semibold text-gray-600">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {discounts.map(d => (
              <tr key={d.id} className="hover:bg-gray-50/50">
                <td className="px-4 py-3 font-mono font-semibold text-primary-700">{d.discount_code || '—'}</td>
                <td className="px-4 py-3 text-gray-800">{d.discount_name}</td>
                <td className="px-4 py-3 text-gray-600 capitalize">{d.discount_type}</td>
                <td className="px-4 py-3 text-right font-semibold">
                  {d.discount_type === 'percentage' ? `${d.discount_value}%` : `₹${d.discount_value}`}
                </td>
                <td className="px-4 py-3 text-right text-gray-500">{d.usage_count || 0}{d.max_usage ? `/${d.max_usage}` : ''}</td>
                <td className="px-4 py-3 text-center">
                  <button onClick={() => toggleMutation.mutate({ id: d.id, is_active: !d.is_active })}
                          className={`cursor-pointer ${d.is_active ? 'badge-green' : 'badge-red'}`}>
                    {d.is_active ? 'Active' : 'Inactive'}
                  </button>
                </td>
              </tr>
            ))}
            {discounts.length === 0 && (
              <tr><td colSpan={6} className="text-center py-8 text-gray-400">No discounts configured</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="font-bold text-lg">Create Discount</h2>
              <button onClick={() => setShowAdd(false)}><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-4 space-y-3">
              <div><label className="label">Discount Name *</label>
                <input className="input" value={form.discount_name} onChange={e => setForm(f => ({...f, discount_name: e.target.value}))} /></div>
              <div><label className="label">Code (optional)</label>
                <input className="input" placeholder="e.g. SUMMER20" value={form.discount_code}
                       onChange={e => setForm(f => ({...f, discount_code: e.target.value.toUpperCase()}))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Type</label>
                  <select className="input" value={form.discount_type} onChange={e => setForm(f => ({...f, discount_type: e.target.value}))}>
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed (₹)</option>
                  </select></div>
                <div><label className="label">Value *</label>
                  <input type="number" className="input" min="0" step="0.01" value={form.discount_value}
                         onChange={e => setForm(f => ({...f, discount_value: e.target.value}))} /></div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowAdd(false)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending}
                        className="btn-primary flex-1">Create</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
