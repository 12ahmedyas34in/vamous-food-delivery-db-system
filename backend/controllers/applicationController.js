// backend/controllers/applicationController.js
//
// Functions:
//   submitRestaurantApplication  POST /api/applications/restaurant
//   submitDriverApplication      POST /api/applications/driver
//
// Pattern: pending-activation
//   - Creates User + Restaurant/Driver rows immediately
//   - Sets is_active: false on Restaurant / Driver until admin approves
//
// NOTE: approve/reject/getPending live in adminController.js (admin-only)

const bcrypt = require('bcryptjs');
const { User, Restaurant, Driver, sequelize } = require('../models');
const logger = require('../config/logger');

// ─── helpers ──────────────────────────────────────────────────────────────────
// Generate a random temporary password the applicant will reset later
const tempPassword = () =>
  Math.random().toString(36).slice(2, 10) +
  Math.random().toString(36).slice(2, 6).toUpperCase();

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/applications/restaurant
// Body: { name, email, phone, restaurant_name, address }
// ══════════════════════════════════════════════════════════════════════════════
const submitRestaurantApplication = async (req, res) => {
  const { name, email, restaurant_name, phone, address } = req.body;

  if (!name || !email || !restaurant_name) {
    return res.status(400).json({
      status:  'error',
      message: 'name, email, and restaurant_name are required.',
    });
  }

  const t = await sequelize.transaction();
  try {
    const password_hash = await bcrypt.hash(tempPassword(), 10);

    // 1. Create user with restaurant_owner role
    //    DB unique constraint on email catches duplicates atomically
    const user = await User.create({
      full_name:     name,
      email,
      phone:         phone || '',
      password_hash,
      role:          'restaurant_owner',
    }, { transaction: t });

    // 2. Create restaurant row — is_active: false until admin approves
    await Restaurant.create({
      owner_id:  user.id,
      name:      restaurant_name,
      address:   address || 'Pending',
      phone:     phone || '',
      is_active: false,
    }, { transaction: t });

    await t.commit();

    logger.info({ userId: user.id, email }, 'Restaurant application submitted');

    return res.status(201).json({
      status:  'success',
      message: 'Application received. An admin will review it shortly.',
    });
  } catch (err) {
    await t.rollback();

    // DB unique constraint on email — friendlier message than a 500
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({
        status:  'error',
        message: 'An account with this email already exists.',
      });
    }

    logger.error({ err }, 'submitRestaurantApplication failed');
    return res.status(500).json({ status: 'error', message: 'Server error. Please try again.' });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/applications/driver
// Body: { name, email, phone, vehicle }
// ══════════════════════════════════════════════════════════════════════════════
const submitDriverApplication = async (req, res) => {
  const { name, email, phone, vehicle } = req.body;

  if (!name || !email) {
    return res.status(400).json({
      status:  'error',
      message: 'name and email are required.',
    });
  }

  const t = await sequelize.transaction();
  try {
    const password_hash = await bcrypt.hash(tempPassword(), 10);

    // 1. Create user with driver role
    const user = await User.create({
      full_name:     name,
      email,
      phone:         phone || '',
      password_hash,
      role:          'driver',
    }, { transaction: t });

    // 2. Create driver row — is_active: false until admin approves
    await Driver.create({
      user_id:        user.id,
      vehicle_type:   vehicle || 'bicycle',
      license_number: 'PENDING',  // applicant provides later during onboarding
      is_available:   false,
      is_active:      false,
    }, { transaction: t });

    await t.commit();

    logger.info({ userId: user.id, email }, 'Driver application submitted');

    return res.status(201).json({
      status:  'success',
      message: 'Application received. An admin will review it shortly.',
    });
  } catch (err) {
    await t.rollback();

    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({
        status:  'error',
        message: 'An account with this email already exists.',
      });
    }

    logger.error({ err }, 'submitDriverApplication failed');
    return res.status(500).json({ status: 'error', message: 'Server error. Please try again.' });
  }
};

module.exports = {
  submitRestaurantApplication,
  submitDriverApplication,
};
