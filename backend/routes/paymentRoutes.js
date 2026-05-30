const express            = require('express');
const router             = express.Router();
const paymentController  = require('../controllers/paymentController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

router.get('/methods',                    protect,                        paymentController.getPaymentMethods);
router.post('/simulate/:orderId',         protect,                        paymentController.simulatePayment);
router.post('/confirm-transfer/:orderId', protect, restrictTo('admin'),   paymentController.confirmTransfer);

module.exports = router;
