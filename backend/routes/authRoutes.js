// backend/routes/authRoutes.js
//
// Phase 3 Push 4: added POST /logout

const express        = require('express');
const router         = express.Router();
const authController = require('../controllers/authController');
const { protect }    = require('../middleware/authMiddleware');

router.post('/register', authController.register);
router.post('/login',    authController.login);
router.post('/logout',   authController.logout);      // Phase 3 Push 4
router.get('/me',  protect, authController.getMe);

module.exports = router;
