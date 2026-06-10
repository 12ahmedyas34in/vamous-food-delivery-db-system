// frontend/src/pages/NotFound.jsx
//
// Catch-all 404 page — rendered by the * route in App.js.
// No API calls, no auth dependency. Fully static.

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 font-body flex flex-col items-center justify-center px-4">

      {/* Brand mark */}
      <Link to="/" className="flex items-center gap-2 mb-12 group">
        <div className="w-8 h-8 rounded-lg bg-brand-300 flex items-center justify-center
          group-hover:bg-brand-400 transition-colors duration-200">
          <span className="text-white font-display font-bold text-sm">S</span>
        </div>
        <span className="font-display font-semibold text-lg text-gray-900 tracking-tight">
          Sapori<span className="text-brand-400">Vivi</span>
        </span>
      </Link>

      {/* Illustration */}
      <div className="text-center mb-8">
        <div className="text-8xl mb-6 select-none" aria-hidden="true">🍽️</div>
        <h1 className="font-display text-5xl font-bold text-gray-900 mb-3">404</h1>
        <h2 className="font-display text-2xl font-semibold text-gray-700 mb-4">Page not found</h2>
        <p className="text-gray-400 text-base max-w-sm mx-auto leading-relaxed">
          Looks like this page got delivered to the wrong address.
          Let's get you back on track.
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => navigate(-1)}
          className="px-6 py-2.5 rounded-full border border-gray-200 text-gray-600
            hover:border-brand-300 hover:text-brand-600
            text-sm font-medium transition-colors duration-200"
        >
          ← Go back
        </button>
        <Link
          to="/"
          className="px-6 py-2.5 rounded-full bg-brand-300 hover:bg-brand-400
            text-white text-sm font-medium text-center
            transition-colors duration-200 shadow-sm"
        >
          Go to home
        </Link>
        <Link
          to="/restaurants"
          className="px-6 py-2.5 rounded-full bg-gray-900 hover:bg-gray-800
            text-white text-sm font-medium text-center
            transition-colors duration-200"
        >
          Browse restaurants
        </Link>
      </div>

    </div>
  );
};

export default NotFound;
