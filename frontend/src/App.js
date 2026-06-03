// frontend/src/App.js
//
// Phase 3 additions (marked):
//   - NotFound catch-all route (*)
//   - /owner/dashboard restricted to restaurant_owner role
//   All existing routes are untouched.

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// ── Existing pages ────────────────────────────────────────────────────────────
import Login             from './pages/Login';
import Register          from './pages/Register';
import RestaurantList    from './pages/RestaurantList';
import Menu              from './pages/Menu';
import Cart              from './pages/Cart';
import MyOrders          from './pages/MyOrders';
import OrderConfirmation from './pages/OrderConfirmation';
import AdminDashboard    from './pages/AdminDashboard';

import Home             from './pages/Home';
import AddRestaurant    from './pages/AddRestaurant';
import SignUpToDeliver  from './pages/SignUpToDeliver';
import AddressBook      from './pages/AddressBook';

import NotFound         from './pages/NotFound';
import OwnerDashboard   from './pages/OwnerDashboard';

// ── Route guards ────
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  return children;
};

// Redirects to /login if no token, or to /restaurants if role doesn't match
const RestrictedRoute = ({ children, allowedRoles }) => {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!allowedRoles.includes(user.role)) {
      return <Navigate to="/restaurants" replace />;
    }
  } catch {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* ── Public routes ── */}
        <Route path="/"               element={<Home />} />
        <Route path="/login"          element={<Login />} />
        <Route path="/register"       element={<Register />} />
        <Route path="/add-restaurant" element={<AddRestaurant />} />
        <Route path="/deliver"        element={<SignUpToDeliver />} />

        {/* ── Protected routes (any authenticated user) ── */}
        <Route path="/restaurants"          element={<ProtectedRoute><RestaurantList /></ProtectedRoute>} />
        <Route path="/restaurants/:id/menu" element={<ProtectedRoute><Menu /></ProtectedRoute>} />
        <Route path="/cart"                 element={<ProtectedRoute><Cart /></ProtectedRoute>} />
        <Route path="/addresses"            element={<ProtectedRoute><AddressBook /></ProtectedRoute>} />
        <Route path="/orders"               element={<ProtectedRoute><MyOrders /></ProtectedRoute>} />
        <Route path="/orders/:id"           element={<ProtectedRoute><OrderConfirmation /></ProtectedRoute>} />

        {/* ── Admin only ── */}
        <Route
          path="/admin"
          element={
            <RestrictedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </RestrictedRoute>
          }
        />

        {/* ── Owner only ── */}
        <Route
          path="/owner/dashboard"
          element={
            <RestrictedRoute allowedRoles={['restaurant_owner']}>
              <OwnerDashboard />
            </RestrictedRoute>
          }
        />

        {/* ── 404 catch-all ── */}
        <Route path="*" element={<NotFound />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;
