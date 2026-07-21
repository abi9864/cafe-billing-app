import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Coffee, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { authService } from '../services';
import { loginSuccess, loginFailure, loginStart } from '../store/slices/authSlice';

export default function LoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    dispatch(loginStart());
    try {
      const res = await authService.login(form.email, form.password);
      dispatch(loginSuccess(res.data));
      toast.success(`Welcome back, ${res.data.user.firstName}!`);
      navigate('/pos');
    } catch (err) {
      const msg = err.response?.data?.error || 'Login failed';
      dispatch(loginFailure(msg));
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cafe-dark via-cafe-brown to-primary-600 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 rounded-2xl mb-4">
            <Coffee className="w-9 h-9 text-cafe-cream" />
          </div>
          <h1 className="text-3xl font-bold text-white">Cafe Billing App</h1>
          <p className="text-cafe-cream/70 mt-1 text-sm">Point of Sale System</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Sign in to your account</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email address</label>
              <input
                type="email"
                className="input"
                placeholder="cashier@cafe.com"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                required
                autoFocus
              />
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full btn-lg mt-2"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Demo credentials */}
          <div className="mt-6 pt-5 border-t border-gray-100">
            <p className="text-xs font-medium text-gray-500 mb-3 uppercase tracking-wide">Demo Accounts</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Admin', email: 'admin@cafe.com' },
                { label: 'Manager', email: 'manager@cafe.com' },
                { label: 'Cashier', email: 'cashier@cafe.com' },
                { label: 'Chef', email: 'chef@cafe.com' }
              ].map(({ label, email }) => (
                <button
                  key={email}
                  type="button"
                  onClick={() => setForm({ email, password: 'password123' })}
                  className="text-xs text-left px-3 py-2 rounded-lg bg-gray-50 hover:bg-primary-50 hover:text-primary-700 transition-colors border border-gray-200"
                >
                  <span className="font-semibold block">{label}</span>
                  <span className="text-gray-500">{email}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
