import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { Plus, Edit2, X, ShieldCheck } from 'lucide-react';
import { userService } from '../services';

export default function UsersPage() {
  const { user } = useSelector(s => s.auth);
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => userService.getUsers().then(r => r.data)
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: () => userService.getRoles().then(r => r.data)
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }) => userService.updateUser(id, { is_active }),
    onSuccess: () => { qc.invalidateQueries(['users']); toast.success('User status updated'); }
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <button onClick={() => { setEditingUser(null); setShowModal(true); }} className="btn-primary btn-sm">
          <Plus className="w-4 h-4" /> Add User
        </button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Name</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Email</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Role</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Location</th>
              <th className="text-center px-4 py-3 font-semibold text-gray-600">Status</th>
              <th className="text-center px-4 py-3 font-semibold text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-gray-50/50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-xs font-bold text-primary-700">
                      {u.first_name[0]}{u.last_name[0]}
                    </div>
                    <span className="font-medium text-gray-900">{u.first_name} {u.last_name}</span>
                    {u.id === user?.id && <span className="badge-blue text-xs">You</span>}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600">{u.email}</td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-1 text-gray-700 capitalize">
                    <ShieldCheck className="w-3.5 h-3.5 text-primary-500" />
                    {u.role_name}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600">{u.location_name || '—'}</td>
                <td className="px-4 py-3 text-center">
                  <button onClick={() => toggleMutation.mutate({ id: u.id, is_active: !u.is_active })}
                          disabled={u.id === user?.id}
                          className={`cursor-pointer ${u.is_active ? 'badge-green' : 'badge-red'}`}>
                    {u.is_active ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td className="px-4 py-3 text-center">
                  <button onClick={() => { setEditingUser(u); setShowModal(true); }}
                          className="p-1.5 rounded hover:bg-blue-50 text-blue-600">
                    <Edit2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan={6} className="text-center py-8 text-gray-400">No users found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <UserFormModal
          user={editingUser}
          roles={roles}
          onClose={() => setShowModal(false)}
          onSuccess={() => { setShowModal(false); qc.invalidateQueries(['users']); }}
        />
      )}
    </div>
  );
}

function UserFormModal({ user, roles, onClose, onSuccess }) {
  const [form, setForm] = useState({
    email: user?.email || '',
    password: '',
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    phone: user?.phone || '',
    role_id: user?.role_id || '',
    is_active: user?.is_active !== undefined ? user.is_active : true
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...form };
      if (user && !payload.password) delete payload.password;
      if (user) {
        await userService.updateUser(user.id, payload);
        toast.success('User updated');
      } else {
        await userService.createUser(payload);
        toast.success('User created');
      }
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save user');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-bold text-lg">{user ? 'Edit User' : 'New User'}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">First Name *</label>
              <input className="input" required value={form.first_name} onChange={e => setForm(f => ({...f, first_name: e.target.value}))} /></div>
            <div><label className="label">Last Name *</label>
              <input className="input" required value={form.last_name} onChange={e => setForm(f => ({...f, last_name: e.target.value}))} /></div>
          </div>
          <div><label className="label">Email *</label>
            <input type="email" className="input" required value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} /></div>
          <div><label className="label">{user ? 'New Password (leave blank to keep)' : 'Password *'}</label>
            <input type="password" className="input" required={!user} minLength={8} value={form.password}
                   onChange={e => setForm(f => ({...f, password: e.target.value}))} placeholder="Min 8 characters" /></div>
          <div><label className="label">Phone</label>
            <input className="input" value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} /></div>
          <div><label className="label">Role *</label>
            <select className="input" required value={form.role_id} onChange={e => setForm(f => ({...f, role_id: parseInt(e.target.value)}))}>
              <option value="">Select role</option>
              {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select></div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="is_active" checked={form.is_active} onChange={e => setForm(f => ({...f, is_active: e.target.checked}))} />
            <label htmlFor="is_active" className="text-sm text-gray-700 cursor-pointer">Active</label>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Saving...' : (user ? 'Update User' : 'Create User')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
