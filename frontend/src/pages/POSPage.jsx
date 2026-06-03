import { useState, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Plus, Minus, Trash2, ShoppingBag, Search, Tag, ChevronRight,
  X, Leaf
} from 'lucide-react';
import { menuService, orderService, settingsService, discountService } from '../services';
import { addItem, removeItem, updateQuantity, setOrderType, setTableNumber,
         setCustomerInfo, setDiscount, clearCart } from '../store/slices/cartSlice';
import { calculateTotals, formatCurrency } from '../utils/calculations';

export default function POSPage() {
  const dispatch = useDispatch();
  const cart = useSelector(s => s.cart);
  const { user } = useSelector(s => s.auth);
  const qc = useQueryClient();

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [discountCode, setDiscountCode] = useState('');

  const locationId = user?.locationId;

  const { data: categories = [] } = useQuery({
    queryKey: ['categories', locationId],
    queryFn: () => menuService.getCategories({ location_id: locationId }).then(r => r.data)
  });

  const { data: menuItems = [] } = useQuery({
    queryKey: ['menuItems', locationId],
    queryFn: () => menuService.getItems({ location_id: locationId, is_active: true }).then(r => r.data)
  });

  const { data: taxRates = [] } = useQuery({
    queryKey: ['taxRates', locationId],
    queryFn: () => settingsService.getTaxRates({ location_id: locationId }).then(r => r.data)
  });

  const filteredItems = menuItems.filter(item => {
    const matchCat = selectedCategory === 'all' || item.category_id === selectedCategory;
    const matchSearch = !searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  const totals = calculateTotals(cart.items, taxRates, cart.discountInfo);

  const handleAddItem = (item, variant = null) => {
    dispatch(addItem({
      id: item.id,
      variantId: variant?.id || null,
      name: item.name,
      price: parseFloat(item.base_price) + (variant ? parseFloat(variant.price_modifier) : 0),
      variantName: variant?.name || null
    }));
    toast.success(`${item.name} added`, { duration: 1000 });
  };

  const applyDiscount = async () => {
    if (!discountCode.trim()) return;
    try {
      const res = await discountService.validateCode(discountCode, { location_id: locationId });
      dispatch(setDiscount(res.data));
      toast.success(`Discount "${res.data.discount_name}" applied!`);
    } catch {
      toast.error('Invalid or expired discount code');
    }
  };

  const placeOrderMutation = useMutation({
    mutationFn: () => orderService.createOrder({
      location_id: locationId,
      order_type: cart.orderType,
      table_number: cart.tableNumber || null,
      customer_name: cart.customerName || null,
      customer_phone: cart.customerPhone || null,
      notes: cart.notes || null,
      discount_id: cart.discountId,
      items: cart.items.map(i => ({
        menu_item_id: i.id,
        variant_id: i.variantId,
        quantity: i.quantity,
        special_instructions: i.specialInstructions || null,
        item_discount: 0
      }))
    }).then(r => r.data),
    onSuccess: (order) => {
      dispatch(clearCart());
      qc.invalidateQueries({ queryKey: ['orders'] });
      toast.success(`Order ${order.order_number} placed — collect payment at counter`);
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Order failed')
  });

  return (
    <div className="flex h-full gap-4 overflow-hidden">
      {/* Menu Panel */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Search & Order Type */}
        <div className="flex gap-3 mb-4 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              className="input pl-9"
              placeholder="Search menu items..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            {['dine-in', 'takeaway', 'delivery'].map(type => (
              <button
                key={type}
                onClick={() => dispatch(setOrderType(type))}
                className={`px-3 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                  cart.orderType === type
                    ? 'bg-primary-600 text-white'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors shrink-0 ${
              selectedCategory === 'all'
                ? 'bg-cafe-dark text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            All Items
          </button>
          {categories.filter(c => c.is_active).map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors shrink-0 ${
                selectedCategory === cat.id
                  ? 'bg-cafe-dark text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Menu Grid */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredItems.map(item => (
              <MenuItemCard key={item.id} item={item} onAdd={handleAddItem} />
            ))}
          </div>
          {filteredItems.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>No items found</p>
            </div>
          )}
        </div>
      </div>

      {/* Cart Panel */}
      <div className="w-80 xl:w-96 flex flex-col bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden shrink-0">
        {/* Cart Header */}
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-primary-600" />
            Order ({cart.items.reduce((s, i) => s + i.quantity, 0)} items)
          </h2>
          {cart.items.length > 0 && (
            <button onClick={() => dispatch(clearCart())} className="text-xs text-red-500 hover:text-red-700">
              Clear
            </button>
          )}
        </div>

        {/* Table / Customer */}
        <div className="px-4 py-2 border-b border-gray-50 flex gap-2">
          {cart.orderType === 'dine-in' && (
            <input
              type="text"
              className="input flex-1 text-sm"
              placeholder="Table #"
              value={cart.tableNumber}
              onChange={e => dispatch(setTableNumber(e.target.value))}
            />
          )}
          <input
            type="text"
            className="input flex-1 text-sm"
            placeholder="Customer name"
            value={cart.customerName}
            onChange={e => dispatch(setCustomerInfo({ name: e.target.value, phone: cart.customerPhone }))}
          />
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto px-4 py-2">
          {cart.items.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <ShoppingBag className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Cart is empty</p>
              <p className="text-xs mt-1">Add items from the menu</p>
            </div>
          ) : (
            <div className="space-y-2">
              {cart.items.map(item => (
                <CartItem key={item.key} item={item} dispatch={dispatch} />
              ))}
            </div>
          )}
        </div>

        {/* Discount */}
        {cart.items.length > 0 && (
          <div className="px-4 py-2 border-t border-gray-50">
            <div className="flex gap-2">
              <input
                type="text"
                className="input flex-1 text-sm"
                placeholder="Promo code"
                value={discountCode}
                onChange={e => setDiscountCode(e.target.value.toUpperCase())}
              />
              <button onClick={applyDiscount} className="btn-secondary btn-sm">
                <Tag className="w-4 h-4" />
              </button>
            </div>
            {cart.discountInfo && (
              <div className="mt-1 flex items-center justify-between text-xs text-green-700 bg-green-50 rounded px-2 py-1">
                <span>{cart.discountInfo.discount_name}</span>
                <button onClick={() => dispatch(setDiscount(null))}>
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Totals */}
        {cart.items.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 space-y-1 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>{formatCurrency(totals.subtotal)}</span>
            </div>
            {totals.discountAmount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span>
                <span>-{formatCurrency(totals.discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-gray-600">
              <span>Tax</span>
              <span>{formatCurrency(totals.taxAmount)}</span>
            </div>
            <div className="flex justify-between font-bold text-gray-900 text-base pt-1 border-t border-gray-200 mt-1">
              <span>Total</span>
              <span className="text-primary-700">{formatCurrency(totals.total)}</span>
            </div>
          </div>
        )}

        {/* Place Order Button */}
        <div className="px-4 py-3">
          <button
            onClick={() => placeOrderMutation.mutate()}
            disabled={cart.items.length === 0 || placeOrderMutation.isPending}
            className="btn-primary w-full btn-lg"
          >
            <ShoppingBag className="w-5 h-5" />
            {placeOrderMutation.isPending ? 'Placing...' : `Place Order · ${formatCurrency(totals.total)}`}
            <ChevronRight className="w-4 h-4 ml-auto" />
          </button>
        </div>
      </div>
    </div>
  );
}

function MenuItemCard({ item, onAdd }) {
  const [showVariants, setShowVariants] = useState(false);

  const handleClick = () => {
    if (item.variants && item.variants.length > 0) {
      setShowVariants(true);
    } else {
      onAdd(item);
    }
  };

  return (
    <div className="card p-3 cursor-pointer hover:shadow-md transition-shadow active:scale-95"
         onClick={handleClick}>
      {item.image_url ? (
        <img src={item.image_url} alt={item.name}
             className="w-full h-28 object-cover rounded-lg mb-2" />
      ) : (
        <div className="w-full h-28 bg-gradient-to-br from-primary-50 to-cafe-cream rounded-lg mb-2 flex items-center justify-center">
          <span className="text-3xl">☕</span>
        </div>
      )}
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-800 truncate">{item.name}</p>
          {item.is_vegetarian && (
            <span className="inline-flex items-center gap-0.5 text-xs text-green-700">
              <Leaf className="w-3 h-3" /> Veg
            </span>
          )}
        </div>
        <p className="text-sm font-bold text-primary-700 shrink-0">{formatCurrency(item.base_price)}</p>
      </div>

      {/* Variant picker modal */}
      {showVariants && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
             onClick={e => { e.stopPropagation(); setShowVariants(false); }}>
          <div className="bg-white rounded-xl p-4 w-64 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800">{item.name}</h3>
              <button onClick={() => setShowVariants(false)}><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-2">
              {item.variants.map(v => (
                <button
                  key={v.id}
                  onClick={() => { onAdd(item, v); setShowVariants(false); }}
                  className="w-full flex justify-between items-center px-3 py-2.5 rounded-lg border border-gray-200 hover:bg-primary-50 hover:border-primary-300 transition-colors"
                >
                  <span className="text-sm font-medium">{v.name}</span>
                  <span className="text-sm font-bold text-primary-700">
                    {formatCurrency(parseFloat(item.base_price) + parseFloat(v.price_modifier))}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CartItem({ item, dispatch }) {
  return (
    <div className="flex items-center gap-2 py-2 border-b border-gray-50 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
        {item.variantName && <p className="text-xs text-gray-500">{item.variantName}</p>}
        <p className="text-xs text-primary-700 font-medium">{formatCurrency(item.price * item.quantity)}</p>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => dispatch(updateQuantity({ key: item.key, quantity: item.quantity - 1 }))}
          className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
        >
          <Minus className="w-3 h-3" />
        </button>
        <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
        <button
          onClick={() => dispatch(updateQuantity({ key: item.key, quantity: item.quantity + 1 }))}
          className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center hover:bg-primary-200 transition-colors"
        >
          <Plus className="w-3 h-3 text-primary-700" />
        </button>
        <button
          onClick={() => dispatch(removeItem(item.key))}
          className="w-6 h-6 rounded-full bg-red-50 flex items-center justify-center hover:bg-red-100 transition-colors ml-1"
        >
          <Trash2 className="w-3 h-3 text-red-500" />
        </button>
      </div>
    </div>
  );
}
