import { NavLink } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  ShoppingCart, LayoutDashboard, UtensilsCrossed, Package,
  BarChart3, Settings, Users, ClipboardList, X, Coffee
} from 'lucide-react';

const navItems = [
  { to: '/pos', label: 'POS', icon: ShoppingCart, roles: ['admin', 'manager', 'cashier', 'staff'] },
  { to: '/orders', label: 'Orders', icon: ClipboardList, roles: ['admin', 'manager', 'cashier', 'chef'] },
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'manager'] },
  { to: '/menu', label: 'Menu', icon: UtensilsCrossed, roles: ['admin', 'manager'] },
  { to: '/inventory', label: 'Inventory', icon: Package, roles: ['admin', 'manager'] },
  { to: '/reports', label: 'Reports', icon: BarChart3, roles: ['admin', 'manager'] },
  { to: '/users', label: 'Users', icon: Users, roles: ['admin'] },
  { to: '/settings', label: 'Settings', icon: Settings, roles: ['admin', 'manager'] }
];

export default function Sidebar({ open, onClose }) {
  const { user } = useSelector(s => s.auth);

  const allowed = navItems.filter(item => item.roles.includes(user?.role));

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 bg-black/40 z-20 lg:hidden" onClick={onClose} />
      )}

      <aside className={`
        fixed lg:static inset-y-0 left-0 z-30 flex flex-col
        w-64 bg-cafe-dark text-white transition-transform duration-300
        ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-0 lg:overflow-hidden'}
      `}>
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Coffee className="w-7 h-7 text-primary-400" />
            <span className="font-bold text-lg tracking-tight">Raja's Cafe</span>
          </div>
          <button onClick={onClose} className="lg:hidden p-1 rounded hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          {allowed.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-300 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User info */}
        <div className="px-4 py-4 border-t border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-sm font-bold">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
