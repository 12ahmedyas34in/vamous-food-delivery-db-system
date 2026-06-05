// backend/controllers/authController.js
//
// Phase 3 Push 4 changes:
//   login    — JWT now set as httpOnly cookie; token removed from response body
//   register — unchanged (returns token in body for initial session setup)
//   logout   — new: clears the httpOnly cookie
//   getMe    — unchanged

const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { User } = require('../models');
const { successResponse } = require('../utils/response');

const signToken = (user) => {
  return jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }
  );
};

// Cookie options — reused for both set and clear
const cookieOptions = () => ({
  httpOnly: true,
  secure:   process.env.NODE_ENV === 'production', // HTTPS only in prod
  sameSite: 'lax',
  maxAge:   30 * 24 * 60 * 60 * 1000, // 30 days in ms
});

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/auth/register
// Unchanged from before — still returns token in body so the client can
// store it and stay logged in immediately after registration.
// ══════════════════════════════════════════════════════════════════════════════
exports.register = async (req, res) => {
  try {
    const { full_name, email, password, phone } = req.body;

    if (!full_name || !email || !password || !phone) {
      return res.status(400).json({ status: 'fail', message: 'Full name, email, phone, and password are required' });
    }
    if (!email.includes('@')) {
      return res.status(400).json({ status: 'fail', message: 'Invalid email format' });
    }
    if (password.length < 6) {
      return res.status(400).json({ status: 'fail', message: 'Password must be at least 6 characters' });
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ status: 'fail', message: 'Email already in use' });
    }

    const salt          = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      full_name,
      email,
      password_hash,
      phone,
      role: 'customer',
    });

    const token = signToken(newUser);

    // Set cookie on register too so the session is immediately cookie-backed
    res.cookie('token', token, cookieOptions());

    return res.status(201).json({
      status: 'success',
      token,
      data: {
        token,
        user: {
          id:   newUser.id,
          name: newUser.full_name,
          role: newUser.role,
        },
      },
      user: {
        id:   newUser.id,
        name: newUser.full_name,
        role: newUser.role,
      },
    });
  } catch (error) {
    res.status(500).json({ status: 'fail', message: error.message });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/auth/login
// Phase 3 Push 4: JWT moved to httpOnly cookie.
// Token is NOT returned in the response body anymore.
// User object (id, name, role) still returned so the frontend can store it
// in localStorage for UI gating (role-based nav, RestrictedRoute checks).
// ══════════════════════════════════════════════════════════════════════════════
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ status: 'fail', message: 'Email and password are required' });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ status: 'fail', message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ status: 'fail', message: 'Invalid email or password' });
    }

    const token = signToken(user);

    // Set JWT as httpOnly cookie — not accessible from JavaScript
    res.cookie('token', token, cookieOptions());

    // Return user object only — no token in body
    return res.status(200).json({
      status: 'success',
      user: {
        id:   user.id,
        name: user.full_name,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ status: 'fail', message: error.message });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/auth/logout
// Phase 3 Push 4: new endpoint — clears the httpOnly cookie.
// ══════════════════════════════════════════════════════════════════════════════
exports.logout = (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });
  return res.status(200).json({ status: 'success', message: 'Logged out successfully.' });
};

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/auth/me
// Unchanged — req.user already normalized by authMiddleware
// ══════════════════════════════════════════════════════════════════════════════
exports.getMe = async (req, res, next) => {
  try {
    return successResponse(res, {
      id:    req.user.id,
      name:  req.user.name,
      email: req.user.email,
      role:  req.user.role,
    }, 'User profile retrieved');
  } catch (error) {
    next(error);
  }
};
