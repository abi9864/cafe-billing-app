import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2, Search, Image, ChevronDown, Leaf, X } from 'lucide-react';
import { menuService } from '../services';
import { formatCurrency } from '../utils/calculations';

export default function MenuManagementPage() {
  const { user } = useSelector(s => s.auth);
  const qc = useQueryClient();
  const locId = user?.locationId;

  const [activeTab, setActiveTab] = useState('items');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [showItemModal, setShowItemModal] = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editingCat, setEditingCat] = useState(null);

  const { data: categories = [] } = useQuery({
    queryKey: ['categories', locId],
    queryFn: () => menuService.getCategories({ location_id: locId }).then(r => r.data)
  });

  const { data: items = [] } = useQuery({
    queryKey: ['menuItems', locId],
    queryFn: () => menuService.getItems({ location_id: locId }).then(r => r.data)
  });

  const deleteItemMutation = useMutation({
    mutationFn: (id) => menuService.deleteItem(id),
    onSuccess: () => { qc.invalidateQueries(['menuItems']); toast.success('Item deactivated'); }
  });

  const deleteCatMutation = useMutation({
    mutationFn: (id) => menuService.deleteCategory(id),
    onSuccess: () => { qc.invalidateQueries(['categories']); toast.success('Category deactivated'); }
  });

  const filtered = items.filter(i => {
    const matchCat = selectedCategory === 'all' || i.category_id === selectedCategory;
    const matchSearch = !search || i.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Menu Management</h1>
        <div className="flex gap-2">
          <button onClick={() => { setEditingCat(null); setShowCatModal(true); }} className="btn-secondary btn-sm">
            <Plus className="w-4 h-4" /> Category
          </button>
          <button onClick={() => { setEditingItem(null); setShowItemModal(true); }} className="btn-primary btn-sm">
            <Plus className="w-4 h-4" /> Add Item
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {['items', 'categories'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              activeTab === tab ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'items' && (
        <>
          <div className="flex gap-3 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" className="input pl-9 w-64" placeholder="Search items..."
                     value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="input w-48" value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}>
              <option value="all">All Categories</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(item => (
              <div key={item.id} className={`card overflow-hidden ${!item.is_active ? 'opacity-60' : ''}`}>
                <div className="h-36 bg-gradient-to-br from-primary-50 to-cafe-cream relative">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl">☕</div>
                  )}
                  <div className="absolute top-2 right-2 flex gap-1">
                    <span className={`badge ${item.is_active ? 'badge-green' : 'badge-red'}`}>
                      {item.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                <div className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-800 truncate">{item.name}</p>
                      <p className="text-xs text-gray-500">{item.category_name}</p>
                    </div>
                    <span className="font-bold text-primary-700 shrink-0">{formatCurrency(item.base_price)}</span>
                  </div>
                  {item.is_vegetarian && (
                    <span className="inline-flex items-center gap-0.5 text-xs text-green-700 mt-1">
                      <Leaf className="w-3 h-3" /> Veg
                    </span>
                  )}
                  <div className="flex gap-1 mt-3">
                    <button onClick={() => { setEditingItem(item); setShowItemModal(true); }}
                            className="btn-secondary btn-sm flex-1">
                      <Edit2 className="w-3 h-3" /> Edit
                    </button>
                    <button onClick={() => { if(confirm('Deactivate this item?')) deleteItemMutation.mutate(item.id); }}
                            className="btn-danger btn-sm">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {filtered.length === 0 && (
            <div className="text-center py-16 text-gray-400">No items found</div>
          )}
        </>
      )}

      {activeTab === 'categories' && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Description</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">Order</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">Status</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {categories.map(cat => (
                <tr key={cat.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-medium text-gray-900">{cat.name}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{cat.description || '—'}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{cat.display_order}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={cat.is_active ? 'badge-green' : 'badge-red'}>{cat.is_active ? 'Active' : 'Inactive'}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex gap-1 justify-center">
                      <button onClick={() => { setEditingCat(cat); setShowCatModal(true); }}
                              className="p-1.5 rounded hover:bg-blue-50 text-blue-600">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => { if(confirm('Deactivate?')) deleteCatMutation.mutate(cat.id); }}
                              className="p-1.5 rounded hover:bg-red-50 text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showItemModal && (
        <ItemFormModal
          item={editingItem}
          categories={categories}
          locationId={locId}
          onClose={() => setShowItemModal(false)}
          onSuccess={() => { setShowItemModal(false); qc.invalidateQueries(['menuItems']); }}
        />
      )}

      {showCatModal && (
        <CategoryFormModal
          category={editingCat}
          locationId={locId}
          onClose={() => setShowCatModal(false)}
          onSuccess={() => { setShowCatModal(false); qc.invalidateQueries(['categories']); }}
        />
      )}
    </div>
  );
}

function ItemFormModal({ item, categories, locationId, onClose, onSuccess }) {
  const [form, setForm] = useState({
    name: item?.name || '',
    description: item?.description || '',
    base_price: item?.base_price || '',
    category_id: item?.category_id || '',
    is_vegetarian: item?.is_vegetarian || false,
    preparation_time: item?.preparation_time || '',
    display_order: item?.display_order || 0,
    is_active: item?.is_active !== undefined ? item.is_active : true
  });
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      fd.append('location_id', locationId);
      if (image) fd.append('image', image);

      if (item) {
        await menuService.updateItem(item.id, fd);
        toast.success('Item updated');
      } else {
        await menuService.createItem(fd);
        toast.success('Item created');
      }
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-bold text-lg">{item ? 'Edit Item' : 'New Menu Item'}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Item Name *</label>
              <input className="input" required value={form.name}
                     onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="label">Category *</label>
              <select className="input" required value={form.category_id}
                      onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}>
                <option value="">Select category</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Base Price (₹) *</label>
              <input type="number" className="input" required min="0" step="0.01"
                     value={form.base_price}
                     onChange={e => setForm(f => ({ ...f, base_price: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <label className="label">Description</label>
              <textarea className="input" rows={2} value={form.description}
                        onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div>
              <label className="label">Prep Time (min)</label>
              <input type="number" className="input" min="0"
                     value={form.preparation_time}
                     onChange={e => setForm(f => ({ ...f, preparation_time: e.target.value }))} />
            </div>
            <div>
              <label className="label">Display Order</label>
              <input type="number" className="input" min="0"
                     value={form.display_order}
                     onChange={e => setForm(f => ({ ...f, display_order: e.target.value }))} />
            </div>
            <div className="flex items-center gap-4 col-span-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_vegetarian}
                       onChange={e => setForm(f => ({ ...f, is_vegetarian: e.target.checked }))} />
                <span className="text-sm text-gray-700">Vegetarian</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_active}
                       onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
                <span className="text-sm text-gray-700">Active</span>
              </label>
            </div>
            <div className="col-span-2">
              <label className="label">Image</label>
              <input type="file" accept="image/*" className="input py-1.5 text-sm"
                     onChange={e => setImage(e.target.files[0])} />
            </div>
          </div>
        </form>
        <div className="p-4 border-t flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handleSubmit} disabled={loading} className="btn-primary flex-1">
            {loading ? 'Saving...' : (item ? 'Update Item' : 'Create Item')}
          </button>
        </div>
      </div>
    </div>
  );
}

function CategoryFormModal({ category, locationId, onClose, onSuccess }) {
  const [form, setForm] = useState({
    name: category?.name || '',
    description: category?.description || '',
    display_order: category?.display_order || 0,
    is_active: category?.is_active !== undefined ? category.is_active : true
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (category) {
        await menuService.updateCategory(category.id, form);
        toast.success('Category updated');
      } else {
        await menuService.createCategory({ ...form, location_id: locationId });
        toast.success('Category created');
      }
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save category');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-bold text-lg">{category ? 'Edit Category' : 'New Category'}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="label">Name *</label>
            <input className="input" required value={form.name}
                   onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="label">Description</label>
            <input className="input" value={form.description}
                   onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div>
            <label className="label">Display Order</label>
            <input type="number" className="input" value={form.display_order}
                   onChange={e => setForm(f => ({ ...f, display_order: e.target.value }))} />
          </div>
          <div className="flex gap-4 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Saving...' : (category ? 'Update' : 'Create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
