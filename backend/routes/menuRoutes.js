// backend/routes/menuRoutes.js
// Mounted at /api/menu-items

const express              = require('express');
const router               = express.Router();
const restaurantController = require('../controllers/restaurantController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

// ── Public ────────────────────────────────────────────────────────────────────
router.get('/:id', restaurantController.getMenuItemById);

// ── Owner / Admin only ────────────────────────────────────────────────────────
router.put('/:id',
  protect,
  restrictTo('restaurant_owner', 'admin'),
  restaurantController.updateMenuItem,
);

module.exports = router;
