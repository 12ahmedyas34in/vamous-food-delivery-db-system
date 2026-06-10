// backend/routes/restaurantRoutes.js
const express              = require('express');
const router               = express.Router();
const restaurantController = require('../controllers/restaurantController');
const reviewController     = require('../controllers/reviewController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

// ── Public ────────────────────────────────────────────────────────────────────
router.get('/',            restaurantController.getRestaurants);
router.get('/:id',         restaurantController.getRestaurantById);
router.get('/:id/menu',    restaurantController.getRestaurantMenu);
router.get('/:id/reviews', reviewController.getRestaurantReviews);

// ── Owner / Admin only ────────────────────────────────────────────────────────
router.put('/:id',
  protect,
  restrictTo('restaurant_owner', 'admin'),
  restaurantController.updateRestaurant,
);

module.exports = router;
