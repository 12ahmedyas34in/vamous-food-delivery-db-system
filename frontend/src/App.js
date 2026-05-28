import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// ── Existing pages──────────────────────────────
import Login            from './pages/Login';
import Register         from './pages/Register';
import RestaurantList   from './pages/RestaurantList';
import Menu             from './pages/Menu';
import Cart             from './pages/Cart';
import MyOrders         from './pages/MyOrders';
import OrderConfirmation from './pages/OrderConfirmation';
import AdminDashboard   from './pages/AdminDashboard';

// New pages
import Home             from './pages/Home';
import AddRestaurant    from './pages/AddRestaurant';
import SignUpToDeliver  from './pages/SignUpToDeliver';
import AddressBook      from './pages/AddressBook';

// ── Auth guard ─────────────────────────────────────────
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  return children;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/*  root now serves the landing page */}
        <Route path="/" element={<Home />} />

        {/* ── Public auth routes  ── */}
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* new public pages */}
        <Route path="/add-restaurant" element={<AddRestaurant />} />
        <Route path="/deliver"        element={<SignUpToDeliver />} />

        {/* ── Protected routes  ── */}
        <Route path="/restaurants"          element={<ProtectedRoute><RestaurantList /></ProtectedRoute>} />
        <Route path="/restaurants/:id/menu" element={<ProtectedRoute><Menu /></ProtectedRoute>} />
        <Route path="/cart"               element={<ProtectedRoute><Cart /></ProtectedRoute>} />
        <Route path="/addresses"          element={<ProtectedRoute><AddressBook /></ProtectedRoute>} />
        <Route path="/orders"             element={<ProtectedRoute><MyOrders /></ProtectedRoute>} />
        <Route path="/orders/:id"         element={<ProtectedRoute><OrderConfirmation /></ProtectedRoute>} />
        <Route path="/admin"              element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />

      </Routes>
    </BrowserRouter>
  );
}
export default App;
