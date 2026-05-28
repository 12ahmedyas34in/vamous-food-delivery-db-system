import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from '../api/axios';

const DELIVERY_FEE = 30.00;

const Cart = () => {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [processingId, setProcessingId] = useState(null); // Per-item locking
  const [error, setError] = useState('');
  
  // Priority 2: Address state
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [addressesLoading, setAddressesLoading] = useState(true);
  const [addressError, setAddressError] = useState('');

  const navigate = useNavigate();

  const fetchCart = async () => {
    try {
      const response = await axios.get('/cart');
      setCartItems(response.data.data);
    } catch (err) {
      setError('Failed to load cart');
    } finally {
      setLoading(false);
    }
  };

  // Priority 2: Fetch user addresses
  const fetchAddresses = async () => {
    try {
      setAddressesLoading(true);
      const response = await axios.get('/addresses');
      const addressList = response.data.data || [];
      setAddresses(addressList);
      
      // Auto-select default address if exists
      const defaultAddr = addressList.find(addr => addr.is_default);
      if (defaultAddr) {
        setSelectedAddressId(defaultAddr.id);
      }
      setAddressError('');
    } catch (err) {
      console.error('Failed to fetch addresses:', err);
      setAddressError('Could not load your addresses. Please refresh.');
    } finally {
      setAddressesLoading(false);
    }
  };

  useEffect(() => {
    fetchCart();
    fetchAddresses();
  }, []);

  // Update Quantity (Optimistic UI Update for speed)
  const handleUpdateQuantity = async (id, newQuantity) => {
    if (newQuantity <= 0 || newQuantity > 100) return;
    setProcessingId(id); // Lock ONLY the item being updated

    try {
      await axios.patch(`/cart/${id}`, { quantity: newQuantity });
      // Instantly update React state so the UI feels lightning fast
      setCartItems((prev) => prev.map((item) => item.id === id ? { ...item, quantity: newQuantity } : item));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update quantity');
      await fetchCart(); // Revert state if backend fails
    } finally {
      setProcessingId(null); // Unlock item
    }
  };

  // Remove Item
  const handleRemove = async (id) => {
    setProcessingId(id);
    try {
      await axios.delete(`/cart/${id}`);
      setCartItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to remove item');
      await fetchCart();
    } finally {
      setProcessingId(null);
    }
  };

  // Phase 5: Place Order
  const handleCheckout = async () => {
    // Validate address selection
    if (!selectedAddressId) {
      setAddressError('Please select a delivery address');
      return;
    }

    // Verify address still exists in current list
    const addressExists = addresses.some(a => a.id === parseInt(selectedAddressId));
    if (!addressExists) {
      setAddressError('Your selected address is no longer available. Please select another.');
      await fetchAddresses();
      return;
    }

    setCheckoutLoading(true); // Lock the checkout button
    setAddressError('');

    try {
      // Send selected address_id directly
      const response = await axios.post('/orders', { 
        address_id: parseInt(selectedAddressId) 
      });
      navigate(`/orders/${response.data.data.id}`); // Redirect to Confirmation
    } catch (err) {
      const errorMessage = err.response?.data?.message;
      
      // ✅ Handle case where address became invalid
      if (errorMessage === 'Invalid delivery address. Address not found or does not belong to you.') {
        setAddressError('Your selected address is no longer valid. Please select another.');
        await fetchAddresses();
        setSelectedAddressId('');
      } else {
        alert(errorMessage || 'Checkout failed. Please try again.');
      }

      // Phantom Cart Sync
      await fetchCart();
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (loading || addressesLoading) return <h2 style={{ padding: '20px' }}>Loading cart...</h2>;

  // Safe chaining (item?.MenuItem?.price) prevents crashes if backend shape changes
  const subtotal = cartItems.reduce((sum, item) => sum + ((item?.MenuItem?.price || 0) * item.quantity), 0);
  const total = subtotal + DELIVERY_FEE;

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial', maxWidth: '800px', margin: '0 auto' }}>
      <button onClick={() => navigate('/restaurants')} style={{ padding: '8px', cursor: 'pointer' }}>← Browse Restaurants</button>

      <h2 style={{ marginTop: '20px' }}>Your Cart</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {cartItems.length === 0 ? (
        <div style={{ textAlign: 'center', marginTop: '40px' }}>
          <p style={{ fontSize: '18px' }}>Your cart is completely empty.</p>
          {/* Empty State Recovery CTA */}
          <button onClick={() => navigate('/restaurants')} style={{ padding: '10px 20px', background: '#000', color: '#fff', cursor: 'pointer', border: 'none', fontSize: '16px' }}>
            Go Find Some Food
          </button>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {cartItems.map((item) => (
              <div key={item.id} style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: processingId === item.id ? 0.5 : 1 }}>
                <div>
                  <h4 style={{ margin: '0 0 5px 0' }}>{item?.MenuItem?.item_name || item?.MenuItem?.name || 'Unknown Item'}</h4>
                  <p style={{ margin: 0, color: 'gray' }}>${item?.MenuItem?.price || 0} each</p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button disabled={processingId === item.id || checkoutLoading} onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}>-</button>
                  <span>{item.quantity}</span>
                  <button disabled={processingId === item.id || checkoutLoading} onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}>+</button>
                  <button disabled={processingId === item.id || checkoutLoading} onClick={() => handleRemove(item.id)} style={{ background: 'red', color: 'white', border: 'none', cursor: 'pointer', padding: '5px 10px' }}>Remove</button>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '30px', padding: '20px', background: '#f9f9f9', borderRadius: '8px' }}>
            <h3>Order Summary</h3>
            <p>Subtotal: ${subtotal.toFixed(2)}</p>
            <p>Delivery Fee: ${DELIVERY_FEE.toFixed(2)}</p>
            <h3>Total: ${total.toFixed(2)}</h3>

            {/* Priority 2: Address Selection Section */}
            <div style={{ marginTop: '20px', borderTop: '1px solid #ddd', paddingTop: '15px' }}>
              <h4>Delivery Address</h4>
              
              {addressError && <p style={{ color: 'red', fontSize: '14px' }}>{addressError}</p>}
              
              {addresses.length === 0 ? (
                <div style={{ padding: '15px', background: '#fff3cd', borderRadius: '8px' }}>
                  <p style={{ margin: '0 0 10px 0' }}>You don't have any saved addresses.</p>
                  <Link to="/addresses" style={{ color: '#007bff', textDecoration: 'none' }}>
                    + Add an Address to Continue
                  </Link>
                </div>
              ) : (
                <>
                  <select
                    value={selectedAddressId}
                    onChange={(e) => {
                      setSelectedAddressId(e.target.value);
                      setAddressError('');
                    }}
                    style={{
                      width: '100%',
                      padding: '12px',
                      fontSize: '16px',
                      borderRadius: '8px',
                      border: '1px solid #ccc',
                      marginBottom: '10px'
                    }}
                  >
                    <option value="">Select a delivery address</option>
                    {addresses.map(addr => (
                      <option key={addr.id} value={addr.id}>
                        {addr.street}, {addr.city} {addr.is_default && ' (Default)'}
                      </option>
                    ))}
                  </select>
                  
                  <Link to="/addresses" style={{ fontSize: '14px', color: '#007bff' }}>
                    Manage Addresses
                  </Link>
                </>
              )}
            </div>

            <button
              onClick={handleCheckout}
              disabled={checkoutLoading || cartItems.length === 0 || !selectedAddressId || addresses.length === 0}
              style={{
                padding: '15px',
                background: (checkoutLoading || cartItems.length === 0 || !selectedAddressId || addresses.length === 0) ? '#ccc' : 'green',
                color: 'white',
                fontSize: '18px',
                border: 'none',
                cursor: (checkoutLoading || cartItems.length === 0 || !selectedAddressId || addresses.length === 0) ? 'not-allowed' : 'pointer',
                width: '100%',
                marginTop: '15px',
                borderRadius: '8px'
              }}
            >
              {checkoutLoading ? 'Processing Order...' : 'Place Order'}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default Cart;
