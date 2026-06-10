// backend/routes/applicationRoutes.js
// Mounted at /api/applications in server.js

const express = require('express');
const router  = express.Router();
const {
  submitRestaurantApplication,
  submitDriverApplication,
} = require('../controllers/applicationController');

// POST /api/applications/restaurant
router.post('/restaurant', submitRestaurantApplication);

// POST /api/applications/driver
router.post('/driver', submitDriverApplication);

module.exports = router;
