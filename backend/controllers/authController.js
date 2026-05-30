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

// POST /api/auth/register
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

    // Response shape matches what Login.js and Register.js both read
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

// POST /api/auth/login
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

    // Phase 1: password column is now password_hash
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ status: 'fail', message: 'Invalid email or password' });
    }

    const token = signToken(user);

    return res.status(200).json({
      status: 'success',
      token,
      user: {
        id:   user.id,
        name: user.full_name,   // Login.js reads response.data.user.name
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ status: 'fail', message: error.message });
  }
};

// GET /api/auth/me
exports.getMe = async (req, res, next) => {
  try {
    // ✅ P3: Return normalized user from req.user (already has 'name')
    return successResponse(res, {
      id:    req.user.id,
      name:  req.user.full_name,
      email: req.user.email,
      role:  req.user.role,
    }, 'User profile retrieved');
  } catch (error) {
    next(error);
  }
};
