// backend/controllers/adminController.js
//
// Functions:
//   getPendingApplications   GET  /api/admin/applications
//   approveApplication       POST /api/admin/applications/:type/:id/approve
//   rejectApplication        POST /api/admin/applications/:type/:id/reject
//
// Payment confirmation lives in paymentController.confirmTransfer —
// re-used directly in adminRoutes.js to avoid duplication.
//
// All routes require: protect + restrictTo('admin')

const bcrypt = require('bcryptjs');
const {
  User, Restaurant, Driver, sequelize,
} = require('../models');
const logger = require('../config/logger');

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/admin/applications
// Returns all inactive restaurants and inactive drivers for admin review.
// Each item carries a `type` field ('restaurant' | 'driver') so the frontend
// can render a unified table and route the approve/reject calls correctly.
// ══════════════════════════════════════════════════════════════════════════════
const getPendingApplications = async (req, res) => {
  try {
    const [restaurants, drivers] = await Promise.all([
      Restaurant.findAll({
        where:   { is_active: false },
        include: [{ model: User, as: 'Owner', attributes: ['id', 'full_name', 'email', 'phone', 'created_at'] }],
        order:   [['created_at', 'DESC']],
      }),
      Driver.findAll({
        where:   { is_active: false },
        include: [{ model: User, attributes: ['id', 'full_name', 'email', 'phone', 'created_at'] }],
        order:   [[{ model: User }, 'created_at', 'DESC']],
      }),
    ]);

    const applications = [
      ...restaurants.map((r) => ({
        type:         'restaurant',
        id:           r.id,
        entity_name:  r.name,
        address:      r.address,
        owner_name:   r.Owner?.full_name,
        owner_email:  r.Owner?.email,
        owner_phone:  r.Owner?.phone,
        user_id:      r.Owner?.id,
        submitted_at: r.Owner?.created_at,
      })),
      ...drivers.map((d) => ({
        type:         'driver',
        id:           d.user_id,         // driver PK is user_id
        entity_name:  d.User?.full_name,
        vehicle_type: d.vehicle_type,
        owner_email:  d.User?.email,
        owner_phone:  d.User?.phone,
        user_id:      d.user_id,
        submitted_at: d.User?.created_at,
      })),
    ].sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at));

    return res.status(200).json({ status: 'success', data: applications });
  } catch (err) {
    logger.error({ err }, 'getPendingApplications failed');
    return res.status(500).json({ status: 'error', message: 'Failed to fetch applications.' });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/admin/applications/:type/:id/approve
// :type  — 'restaurant' | 'driver'
// :id    — Restaurant.id for restaurants; Driver.user_id for drivers
// ══════════════════════════════════════════════════════════════════════════════
const approveApplication = async (req, res) => {
  const { type, id } = req.params;

  try {
    if (type === 'restaurant') {
      const restaurant = await Restaurant.findOne({
        where:   { id, is_active: false },
        include: [{ model: User, as: 'Owner', attributes: ['id'] }],
      });
      if (!restaurant) {
        return res.status(404).json({ status: 'error', message: 'Pending restaurant not found.' });
      }

      // Generate a new readable temp password and update the user's hash
      const tempPw      = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6).toUpperCase();
      const password_hash = await bcrypt.hash(tempPw, 10);
      await User.update({ password_hash }, { where: { id: restaurant.owner_id } });

      await restaurant.update({ is_active: true });
      logger.info({ restaurantId: id, adminId: req.user.id }, 'Restaurant application approved');

      return res.status(200).json({
        status:       'success',
        message:      'Restaurant approved and is now active.',
        temp_password: tempPw,   // shown once — admin must pass this to the owner
      });
    }

    if (type === 'driver') {
      const driver = await Driver.findOne({ where: { user_id: id, is_active: false } });
      if (!driver) {
        return res.status(404).json({ status: 'error', message: 'Pending driver not found.' });
      }

      // Generate a new readable temp password and update the user's hash
      const tempPw      = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6).toUpperCase();
      const password_hash = await bcrypt.hash(tempPw, 10);
      await User.update({ password_hash }, { where: { id } });

      await driver.update({ is_active: true, is_available: true });
      logger.info({ driverUserId: id, adminId: req.user.id }, 'Driver application approved');

      return res.status(200).json({
        status:        'success',
        message:       'Driver approved and is now active.',
        temp_password: tempPw,   // shown once — admin must pass this to the driver
      });
    }

    return res.status(400).json({ status: 'error', message: 'Invalid type. Must be "restaurant" or "driver".' });
  } catch (err) {
    logger.error({ err }, 'approveApplication failed');
    return res.status(500).json({ status: 'error', message: 'Approval failed. Please try again.' });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/admin/applications/:type/:id/reject
// Soft-deletes the User (sets deleted_at) and destroys the Restaurant/Driver row.
// Does NOT hard-delete so records are preserved for audit purposes.
// ══════════════════════════════════════════════════════════════════════════════
const rejectApplication = async (req, res) => {
  const { type, id } = req.params;
  const t = await sequelize.transaction();

  try {
    if (type === 'restaurant') {
      const restaurant = await Restaurant.findOne({ where: { id, is_active: false }, transaction: t });
      if (!restaurant) {
        await t.rollback();
        return res.status(404).json({ status: 'error', message: 'Pending restaurant not found.' });
      }
      await User.update(
        { deleted_at: new Date() },
        { where: { id: restaurant.owner_id }, transaction: t }
      );
      await restaurant.destroy({ transaction: t });
      await t.commit();
      logger.info({ restaurantId: id, adminId: req.user.id }, 'Restaurant application rejected');
      return res.status(200).json({ status: 'success', message: 'Application rejected.' });
    }

    if (type === 'driver') {
      const driver = await Driver.findOne({ where: { user_id: id, is_active: false }, transaction: t });
      if (!driver) {
        await t.rollback();
        return res.status(404).json({ status: 'error', message: 'Pending driver not found.' });
      }
      await User.update(
        { deleted_at: new Date() },
        { where: { id }, transaction: t }
      );
      await driver.destroy({ transaction: t });
      await t.commit();
      logger.info({ driverUserId: id, adminId: req.user.id }, 'Driver application rejected');
      return res.status(200).json({ status: 'success', message: 'Application rejected.' });
    }

    await t.rollback();
    return res.status(400).json({ status: 'error', message: 'Invalid type. Must be "restaurant" or "driver".' });
  } catch (err) {
    await t.rollback();
    logger.error({ err }, 'rejectApplication failed');
    return res.status(500).json({ status: 'error', message: 'Rejection failed. Please try again.' });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/admin/partners
// Returns active partners (is_active: true)
// ══════════════════════════════════════════════════════════════════════════════
const getActivePartners = async (req, res) => {
  try {
    const [restaurants, drivers] = await Promise.all([
      Restaurant.findAll({
        where:   { is_active: true },
        include: [{ model: User, as: 'Owner', attributes: ['id', 'full_name', 'email', 'phone', 'created_at'] }],
        order:   [['created_at', 'DESC']],
      }),
      Driver.findAll({
        where:   { is_active: true },
        include: [{ model: User, attributes: ['id', 'full_name', 'email', 'phone', 'created_at'] }],
        order:   [[{ model: User }, 'created_at', 'DESC']],
      }),
    ]);

    const partners = [
      ...restaurants.map((r) => ({
        type:         'restaurant',
        id:           r.id,
        entity_name:  r.name,
        address:      r.address,
        owner_name:   r.Owner?.full_name,
        owner_email:  r.Owner?.email,
        owner_phone:  r.Owner?.phone,
        user_id:      r.Owner?.id,
        submitted_at: r.Owner?.created_at,
        is_active:    r.is_active
      })),
      ...drivers.map((d) => ({
        type:         'driver',
        id:           d.user_id,
        entity_name:  d.User?.full_name,
        vehicle_type: d.vehicle_type,
        owner_email:  d.User?.email,
        owner_phone:  d.User?.phone,
        user_id:      d.user_id,
        submitted_at: d.User?.created_at,
        is_active:    d.is_active
      })),
    ].sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at));

    return res.status(200).json({ status: 'success', data: partners });
  } catch (err) {
    logger.error({ err }, 'getActivePartners failed');
    return res.status(500).json({ status: 'error', message: 'Failed to fetch active partners.' });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// PATCH /api/admin/partners/:type/:id/toggle-active
// Toggles the is_active status of a partner.
// ══════════════════════════════════════════════════════════════════════════════
const togglePartnerStatus = async (req, res) => {
  const { type, id } = req.params;
  try {
    if (type === 'restaurant') {
      const restaurant = await Restaurant.findOne({ where: { id } });
      if (!restaurant) return res.status(404).json({ status: 'error', message: 'Restaurant not found' });
      await restaurant.update({ is_active: !restaurant.is_active });
      return res.status(200).json({ status: 'success', message: `Restaurant ${restaurant.is_active ? 'activated' : 'deactivated'}` });
    }
    if (type === 'driver') {
      const driver = await Driver.findOne({ where: { user_id: id } });
      if (!driver) return res.status(404).json({ status: 'error', message: 'Driver not found' });
      await driver.update({ is_active: !driver.is_active });
      return res.status(200).json({ status: 'success', message: `Driver ${driver.is_active ? 'activated' : 'deactivated'}` });
    }
    return res.status(400).json({ status: 'error', message: 'Invalid type' });
  } catch (err) {
    logger.error({ err }, 'togglePartnerStatus failed');
    return res.status(500).json({ status: 'error', message: 'Failed to toggle status.' });
  }
};

module.exports = {
  getPendingApplications,
  approveApplication,
  rejectApplication,
  getActivePartners,
  togglePartnerStatus,
};
