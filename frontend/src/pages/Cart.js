// frontend/src/pages/Cart.js
//
// Phase 3 Part 1 change: Payment method selection added at checkout.
//
// New behaviour:
//   - Fetches available payment methods from GET /api/payments/methods on mount
//   - Renders a radio-button selector for each method
//   - Sends selected payment_method_id with the order POST request
//   - COD → order immediately goes to PAID (confirmed by backend)
//   - Bank Transfer / Tele Birr → order goes to PENDING_PAYMENT (admin confirms later)
//   - Shows the user a clear message explaining what happens next
//
// Everything else (address selector, cart items, quantity, totals) is unchanged.

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axios';

// ── Payment method icons ──────────────────────────────────────────────────────
const METHOD_META = {
  'Cash on Delivery': {
    icon: '💵',
    description: 'Pay the driver when your order arrives. No waiting required.',
    badge: 'Instant confirmation',
    badgeColor: 'bg-green-50 text-green-700',
  },
  'Bank Transfer': {
    icon: '🏦',
    description: 'Transfer to our bank account. Admin confirms within 1 minutes.',
    badge: 'Pending confirmation',
    badgeColor: 'bg-amber-50 text-amber-700',
  },
  'Tele Birr': {
    icon: '📱',
    description: 'Send via Tele Birr to our account. Admin confirms within 1 minute.',
    badge: 'Pending confirmation',
    badgeColor: 'bg-amber-50 text-amber-700',
  },
};

const Cart = () => {
  const navigate = useNavigate();

  const [cartItems, setCartItems] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [selectedMethod, setSelectedMethod] = useState(null); // payment_method_id
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Fetch cart, addresses, and payment methods in parallel
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [cartRes, addrRes, methodsRes] = await Promise.all([
          axios.get('/cart'),
          axios.get('/addresses'),
          axios.get('/payments/methods'),
        ]);
        setCartItems(cartRes.data.data || []);
        setAddresses(addrRes.data.data || []);
        setPaymentMethods(methodsRes.data.data || []);

        // Auto-select the default address
        const defaultAddr = addrRes.data.data?.find(a => a.is_default);
        if (defaultAddr) setSelectedAddress(defaultAddr.id);

        // Auto-select Cash on Delivery as the default method
        const cod = methodsRes.data.data?.find(m => m.method_name === 'Cash on Delivery');
        if (cod) setSelectedMethod(cod.id);
      } catch {
        setError('Failed to load cart. Please refresh and try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // ── Cart mutations ────────────────────────────────────────────────────────
  const updateQuantity = async (itemId, newQty) => {
    if (newQty < 1) return;
    try {
      await axios.patch(`/cart/${itemId}`, { quantity: newQty });
      setCartItems(prev => prev.map(i => i.id === itemId ? { ...i, quantity: newQty } : i));
    } catch {
      setError('Failed to update quantity.');
    }
  };

  const removeItem = async (itemId) => {
    try {
      await axios.delete(`/cart/${itemId}`);
      setCartItems(prev => prev.filter(i => i.id !== itemId));
    } catch {
      setError('Failed to remove item.');
    }
  };

  // ── Order submission ──────────────────────────────────────────────────────
  const handleCheckout = async () => {
    if (submitting) return;
    if (cartItems.length === 0) { setError('Your cart is empty.'); return; }
    if (!selectedAddress) { setError('Please select a delivery address.'); return; }
    if (!selectedMethod) { setError('Please select a payment method.'); return; }

    setSubmitting(true);
    setError('');

    try {
      // Backend reads cart items server-side — only address and payment method needed
      const response = await axios.post('/orders', {
        address_id: selectedAddress,
        payment_method_id: selectedMethod,
      });
      navigate(`/orders/${response.data.data.id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to place order. Please try again.');
      setSubmitting(false);
    }
  };

  // ── Derived values ────────────────────────────────────────────────────────
  const subtotal = cartItems.reduce(
    (sum, item) => sum + parseFloat(item.MenuItem?.price ?? 0) * item.quantity, 0
  );
  const selectedMethodName = paymentMethods.find(m => m.id === selectedMethod)?.method_name ?? '';
  const isPendingPayment = ['Bank Transfer', 'Tele Birr'].includes(selectedMethodName);

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-body">
        <p className="text-gray-400">Loading your cart…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-body">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <h1 className="font-display text-3xl font-bold text-gray-900 mb-8">Your cart</h1>

        {error && (
          <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-6">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {cartItems.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <p className="text-4xl mb-4">🛒</p>
            <p className="text-gray-500 text-lg mb-6">Your cart is empty</p>
            <button
              onClick={() => navigate('/restaurants')}
              className="px-6 py-2.5 bg-brand-300 hover:bg-brand-400 text-white
                rounded-full text-sm font-medium transition-colors"
            >
              Browse restaurants
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-6">

            {/* ── Cart items ── */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-50">
                <h2 className="font-semibold text-gray-900">Order items</h2>
              </div>
              <div className="divide-y divide-gray-50">
                {cartItems.map(item => (
                  <div key={item.id} className="flex items-center gap-4 px-5 py-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {item.MenuItem?.name ?? item.MenuItem?.item_name ?? 'Unknown item'}
                      </p>
                      <p className="text-brand-500 text-sm font-semibold mt-0.5">
                        ETB {parseFloat(item.MenuItem?.price ?? 0).toFixed(2)}
                      </p>
                    </div>
                    {/* Quantity controls */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="w-7 h-7 rounded-full border border-gray-200 text-gray-500
                          hover:border-brand-300 hover:text-brand-600
                          flex items-center justify-center text-sm transition-colors"
                      >−</button>
                      <span className="w-6 text-center text-sm font-medium text-gray-900">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-7 h-7 rounded-full border border-gray-200 text-gray-500
                          hover:border-brand-300 hover:text-brand-600
                          flex items-center justify-center text-sm transition-colors"
                      >+</button>
                    </div>
                    <p className="w-20 text-right font-semibold text-gray-900 text-sm">
                      ETB {(parseFloat(item.MenuItem?.price ?? 0) * item.quantity).toFixed(2)}
                    </p>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-gray-300 hover:text-red-400 transition-colors text-lg"
                      aria-label="Remove item"
                    >×</button>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Delivery address ── */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-50">
                <h2 className="font-semibold text-gray-900">Delivery address</h2>
              </div>
              <div className="px-5 py-4 flex flex-col gap-2">
                {addresses.length === 0 ? (
                  <p className="text-gray-400 text-sm">
                    No saved addresses.{' '}
                    <button
                      onClick={() => navigate('/addresses')}
                      className="text-brand-500 hover:underline"
                    >Add one</button>
                  </p>
                ) : (
                  <>
                    {addresses.map(addr => (
                      <label
                        key={addr.id}
                        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all
                          ${selectedAddress === addr.id
                            ? 'border-brand-300 bg-brand-50'
                            : 'border-gray-100 hover:border-gray-200'}`}
                      >
                        <input
                          type="radio"
                          name="address"
                          value={addr.id}
                          checked={selectedAddress === addr.id}
                          onChange={() => setSelectedAddress(addr.id)}
                          className="mt-0.5 accent-brand-400"
                        />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{addr.street}</p>
                          <p className="text-xs text-gray-400">{addr.city}</p>
                          {addr.is_default && (
                            <span className="text-xs text-brand-500 font-medium">Default</span>
                          )}
                        </div>
                      </label>
                    ))}
                    <button
                      onClick={() => navigate('/addresses')}
                      className="mt-2 text-xs text-brand-500 hover:text-brand-600 hover:underline transition-colors self-start"
                    >
                      + Manage addresses
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* ── Payment method selection (Phase 3 Part 1) ── */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-50">
                <h2 className="font-semibold text-gray-900">Payment method</h2>
              </div>
              <div className="px-5 py-4 flex flex-col gap-2">
                {paymentMethods
                  // Filter out the dev-only simulated method
                  .filter(m => !m.method_name.toLowerCase().includes('simulated'))
                  .map(method => {
                    const meta = METHOD_META[method.method_name] ?? {
                      icon: '💳', description: '', badge: '', badgeColor: '',
                    };
                    return (
                      <label
                        key={method.id}
                        className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all
                          ${selectedMethod === method.id
                            ? 'border-brand-300 bg-brand-50'
                            : 'border-gray-100 hover:border-gray-200'}`}
                      >
                        <input
                          type="radio"
                          name="payment"
                          value={method.id}
                          checked={selectedMethod === method.id}
                          onChange={() => setSelectedMethod(method.id)}
                          className="mt-1 accent-brand-400"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xl" aria-hidden="true">{meta.icon}</span>
                            <p className="text-sm font-semibold text-gray-900">{method.method_name}</p>
                            {meta.badge && (
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${meta.badgeColor}`}>
                                {meta.badge}
                              </span>
                            )}
                          </div>
                          {meta.description && (
                            <p className="text-xs text-gray-400 leading-relaxed">{meta.description}</p>
                          )}
                        </div>
                      </label>
                    );
                  })}
              </div>
              {/* Pending payment notice */}
              {isPendingPayment && (
                <div className="mx-5 mb-4 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                  <p className="text-xs text-amber-700 leading-relaxed">
                    <strong>How it works:</strong> Your order will be placed immediately and will
                    show as <em>Awaiting Payment</em>. Once you transfer the funds, an admin will
                    verify and confirm your order within 1–2 minutes.
                  </p>
                </div>
              )}
            </div>

            {/* ── Order summary ── */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="font-semibold text-gray-900 mb-4">Order summary</h2>
              <div className="flex flex-col gap-2 text-sm">
                <div className="flex justify-between text-gray-500">
                  <span>Subtotal</span>
                  <span>ETB {subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Delivery fee</span>
                  <span className="text-gray-400 text-xs italic">Calculated at confirmation</span>
                </div>
                <div className="border-t border-gray-100 pt-3 flex justify-between font-bold text-gray-900 text-base">
                  <span>Total</span>
                  <span>ETB {subtotal.toFixed(2)}+</span>
                </div>
              </div>

              <button
                onClick={handleCheckout}
                disabled={submitting || cartItems.length === 0 || !selectedAddress || !selectedMethod}
                className={`w-full mt-5 py-3.5 rounded-xl font-semibold text-white text-sm
                  transition-all duration-200
                  ${submitting || !selectedAddress || !selectedMethod
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-gray-900 hover:bg-gray-800 active:bg-gray-700 shadow-sm hover:shadow-md'}`}
              >
                {submitting
                  ? 'Placing order…'
                  : isPendingPayment
                    ? `Place order · Pay via ${selectedMethodName}`
                    : 'Place order'}
              </button>
            </div>

          </div>
        )}
      </div>
    </div>
  );
};

export default Cart;
