const { Address, Order, sequelize } = require('../models');
const { successResponse, errorResponse } = require('../utils/response');
const { Op }                             = require('sequelize');
const logger                             = require('../config/logger');

// GET /api/addresses
exports.getAddresses = async (req, res, next) => {
  try {
    const addresses = await Address.findAll({
      where: { user_id: req.user.id },
      order: [['is_default', 'DESC'], ['id', 'ASC']],
    });
    return successResponse(res, addresses, 'Addresses retrieved');
  } catch (err) {
    next(err);
  }
};

// POST /api/addresses
exports.createAddress = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { street, city, postal_code, is_default = false } = req.body;

    if (is_default) {
      await Address.update(
        { is_default: false },
        { 
          where: { user_id: req.user.id },
          transaction: t 
        }
      );
    }

    const address = await Address.create({
      user_id: req.user.id,
      street,
      city,
      postal_code: postal_code ?? null,
      is_default,
    }, { transaction: t });

    await t.commit();

    logger.info({ addressId: address.id, userId: req.user.id }, 'Address created');
    return successResponse(res, address, 'Address created', 201);
  } catch (err) {
    await t.rollback();
    next(err);
  }
};

// PUT /api/addresses/:id
exports.updateAddress = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const address = await Address.findOne({
      where: { id: req.params.id, user_id: req.user.id },
      transaction: t,
      lock: t.LOCK.UPDATE
    });

    if (!address) {
      await t.rollback();
      return errorResponse(res, 'Address not found or access denied', 404);
    }

    const { street, city, postal_code, is_default } = req.body;

    // Prevent removing default status when it's the only address
    if (is_default === false && address.is_default === true) {
      const otherCount = await Address.count({
        where: { user_id: req.user.id, id: { [Op.ne]: address.id } },
        transaction: t
      });
      if (otherCount === 0) {
        await t.rollback();
        return errorResponse(res, 'You must have at least one default address', 400);
      }
    }

    if (is_default) {
      await Address.update(
        { is_default: false },
        { 
          where: { user_id: req.user.id },
          transaction: t 
        }
      );
    }

    await address.update({
      ...(street      !== undefined && { street }),
      ...(city        !== undefined && { city }),
      ...(postal_code !== undefined && { postal_code }),
      ...(is_default  !== undefined && { is_default }),
    }, { transaction: t });

    await t.commit();

    logger.info({ addressId: address.id, userId: req.user.id }, 'Address updated');
    return successResponse(res, address, 'Address updated');
  } catch (err) {
    await t.rollback();
    next(err);
  }
};

// DELETE /api/addresses/:id
exports.deleteAddress = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const address = await Address.findOne({
      where: { id: req.params.id, user_id: req.user.id },
      transaction: t,
      lock: t.LOCK.UPDATE
    });

    if (!address) {
      await t.rollback();
      return errorResponse(res, 'Address not found or access denied', 404);
    }

    // Prevent deleting the last address
    if (address.is_default) {
      const otherCount = await Address.count({
        where: { user_id: req.user.id, id: { [Op.ne]: address.id } },
        transaction: t
      });
      if (otherCount === 0) {
        await t.rollback();
        return errorResponse(res, 'Cannot delete your only address. Add another address first.', 400);
      }
    }

    // Prevent deletion if address is tied to an active order
    const activeOrderCount = await Order.count({
      where: {
        address_id: address.id,
        status: ['PENDING', 'PENDING_PAYMENT', 'PAID', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'],
      },
      transaction: t
    });

    if (activeOrderCount > 0) {
      await t.rollback();
      return errorResponse(res, 'Cannot delete this address while it has active orders.', 409);
    }

    await address.destroy({ transaction: t });

    await t.commit();

    logger.info({ addressId: address.id, userId: req.user.id }, 'Address deleted');
    return successResponse(res, null, 'Address deleted');
  } catch (err) {
    await t.rollback();
    next(err);
  }
};

/**
 * PATCH /api/addresses/:id/default
 * Set an address as default using transaction (prevents race conditions)
 */
exports.setDefaultAddress = async (req, res, next) => {
  const t = await sequelize.transaction();
  
  try {
    const addressId = parseInt(req.params.id, 10);
    
    if (isNaN(addressId) || addressId <= 0) {
      await t.rollback();
      return errorResponse(res, 'Invalid address ID', 400);
    }

    // Verify address exists and belongs to user (with lock)
    const address = await Address.findOne({
      where: { id: addressId, user_id: req.user.id },
      lock: t.LOCK.UPDATE,
      transaction: t
    });

    if (!address) {
      await t.rollback();
      return errorResponse(res, 'Address not found or access denied', 404);
    }

    // Atomic transaction: clear all defaults, then set this one
    await Address.update(
      { is_default: false },
      { 
        where: { user_id: req.user.id },
        transaction: t 
      }
    );

    await Address.update(
      { is_default: true },
      { 
        where: { id: addressId },
        transaction: t 
      }
    );

    await t.commit();

    logger.info({ addressId, userId: req.user.id }, 'Default address updated');

    return successResponse(res, { addressId, is_default: true }, 'Default address updated', 200);
  } catch (error) {
    await t.rollback();
    next(error);
  }
};
