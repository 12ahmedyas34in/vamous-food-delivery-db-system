// frontend/src/pages/Menu.js

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../api/axios';

// Shown in the restaurant header when image_url is null
const HeaderPlaceholder = () => (
  <div
    className="w-full h-full"
    style={{ background: 'linear-gradient(135deg, #87BEEB 0%, #3787cc 100%)' }}
  />
);

// Shown in menu item row when image_url is null
const ItemImagePlaceholder = () => (
  <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-xl">
    <span className="text-2xl select-none">🍽️</span>
  </div>
);

// Star rating display — shared by review list
const StarRating = ({ rating }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map(star => (
      <span
        key={star}
        className={star <= rating ? 'text-yellow-400' : 'text-gray-200'}
        aria-hidden="true"
      >
        ★
      </span>
    ))}
  </div>
);

const Menu = () => {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [restaurant, setRestaurant] = useState(null);
  const [menuItems,  setMenuItems]  = useState([]);
  const [reviews,    setReviews]    = useState([]);
  const [stats,      setStats]      = useState({ averageRating: 0, totalReviews: 0 });
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [addingId,   setAddingId]   = useState(null); // prevents double-tap on Add button

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [restRes, menuRes, reviewsRes] = await Promise.all([
          axios.get(`/restaurants/${id}`),
          axios.get(`/restaurants/${id}/menu`),
          axios.get(`/restaurants/${id}/reviews`),
        ]);
        setRestaurant(restRes.data.data);
        setMenuItems(menuRes.data.data   || []);
        setReviews(reviewsRes.data.data  || []);
        setStats(reviewsRes.data.stats   || { averageRating: 0, totalReviews: 0 });
      } catch {
        setError('Failed to load restaurant data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const addToCart = async (menuItemId) => {
    if (addingId === menuItemId) return; // prevent double-click
    setAddingId(menuItemId);
    try {
      await axios.post('/cart', { menu_item_id: menuItemId, quantity: 1 });
      // Feedback toast
      alert('Added to cart!');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add to cart.');
    } finally {
      setAddingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-body">
        <p className="text-gray-400">Loading menu…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-body">

      {/* ── Restaurant header with cover image ── */}
      <div className="relative h-56 overflow-hidden bg-gray-200">
        {restaurant?.image_url ? (
          <img
            src={restaurant.image_url}
            alt={restaurant.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <HeaderPlaceholder />
        )}
        {/* Text legibility gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <button
            onClick={() => navigate('/restaurants')}
            className="text-white/70 hover:text-white text-sm mb-2 flex items-center gap-1 transition-colors"
          >
            ← Restaurants
          </button>
          <h1 className="font-display text-2xl font-bold text-white">{restaurant?.name}</h1>
          <div className="flex items-center gap-4 mt-1.5">
            {stats.totalReviews > 0 && (
              <span className="text-yellow-400 text-sm font-medium">
                ★ {stats.averageRating} · {stats.totalReviews} review{stats.totalReviews !== 1 ? 's' : ''}
              </span>
            )}
            {restaurant?.estimated_time && (
              <span className="text-white/60 text-sm">~{restaurant.estimated_time} min</span>
            )}
            {restaurant?.delivery_fee > 0 && (
              <span className="text-white/60 text-sm">
                ETB {parseFloat(restaurant.delivery_fee).toFixed(0)} delivery
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {error && (
          <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-6">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* ── Menu items ── */}
        <div className="flex flex-col gap-3 mb-10">
          {!error && menuItems.length === 0 && (
            <p className="text-gray-400 text-center py-12">No items available right now.</p>
          )}
          {menuItems.map(item => (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-gray-100 overflow-hidden
                flex items-center gap-4 p-4 hover:shadow-sm transition-shadow duration-200"
            >
              {/* Item image */}
              <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0">
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ItemImagePlaceholder />
                )}
              </div>

              {/* Item details */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900">{item.name}</h3>
                {item.description && (
                  <p className="text-gray-400 text-sm mt-0.5 line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>
                )}
                <p className="text-brand-500 font-bold mt-1.5">
                  ETB {parseFloat(item.price).toFixed(2)}
                </p>
              </div>

              {/* Add to cart */}
              <button
                onClick={() => addToCart(item.id)}
                disabled={addingId === item.id}
                className="flex-shrink-0 px-4 py-2 bg-brand-300 hover:bg-brand-400 active:bg-brand-500
                  text-white text-sm font-medium rounded-full
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-colors duration-200"
              >
                {addingId === item.id ? '…' : 'Add'}
              </button>
            </div>
          ))}
        </div>

        {/* Proceed to cart */}
        <div className="text-center mb-12">
          <button
            onClick={() => navigate('/cart')}
            className="px-8 py-3 bg-gray-900 hover:bg-gray-800 active:bg-gray-700
              text-white font-semibold rounded-full transition-colors duration-200"
          >
            View cart →
          </button>
        </div>

        {/* ── Reviews ── */}
        {reviews.length > 0 && (
          <div className="border-t border-gray-200 pt-8">
            <h2 className="font-display text-xl font-bold text-gray-900 mb-5">Customer reviews</h2>
            <div className="flex flex-col gap-3">
              {reviews.map((review, index) => (
                <div
                  key={`${review.createdAt}-${index}`}
                  className="bg-white rounded-xl border border-gray-100 p-4"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <StarRating rating={review.rating} />
                    <span className="text-gray-400 text-xs">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {review.comment && (
                    <p className="text-gray-600 text-sm leading-relaxed">{review.comment}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Menu;
