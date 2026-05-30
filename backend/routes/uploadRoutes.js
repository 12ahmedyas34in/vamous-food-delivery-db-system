// backend/routes/uploadRoutes.js
//
// Image upload endpoints — all require authentication and
// restaurant_owner or admin role.
//
// Rate limited to 20 uploads per IP per 15 minutes to prevent
// storage abuse from compromised or malicious accounts.

const express          = require('express');
const rateLimit        = require('express-rate-limit');
const router           = express.Router();
const uploadController = require('../controllers/uploadController');
const { protect, restrictTo } = require('../middleware/authMiddleware');
const { uploadSingle } = require('../middleware/upload');

const uploadLimiter = rateLimit({
  windowMs:        15 * 60 * 1000, // 15 minutes
  max:             20,              // 20 uploads per window per IP
  standardHeaders: true,
  legacyHeaders:   false,
  message: {
    status:  'error',
    message: 'Too many uploads. Please wait before trying again.',
  },
});

// Middleware chain for all upload routes:
// protect → role check → rate limit → file parse → controller
const uploadGuard = [
  protect,
  restrictTo('restaurant_owner', 'admin'),
  uploadLimiter,
  uploadSingle,
];

// POST /api/upload/restaurant
// Body: multipart/form-data — field 'image' (file) + field 'restaurant_id'
router.post('/restaurant', ...uploadGuard, uploadController.uploadRestaurantImage);

// POST /api/upload/menu-item
// Body: multipart/form-data — field 'image' (file) + field 'menu_item_id'
router.post('/menu-item', ...uploadGuard, uploadController.uploadMenuItemImage);

// DELETE /api/upload/image
// Body: JSON — field 'public_id'
router.delete('/image',
  protect,
  restrictTo('restaurant_owner', 'admin'),
  uploadController.deleteImage
);

module.exports = router;
