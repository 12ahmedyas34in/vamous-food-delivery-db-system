const express           = require('express');
const router            = express.Router();
const addressController = require('../controllers/addressController');
const { protect }       = require('../middleware/authMiddleware');
const validate          = require('../middleware/validate');
const { schemas }       = require('../middleware/schemas');

router.get('/',       protect, addressController.getAddresses);
router.post('/',      protect, validate(schemas.address.create), addressController.createAddress);
router.put('/:id',    protect, validate(schemas.address.update), addressController.updateAddress);
router.patch('/:id/default', protect, addressController.setDefaultAddress);
router.delete('/:id', protect, addressController.deleteAddress);

module.exports = router;
