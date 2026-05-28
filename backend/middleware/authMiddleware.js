// backend/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { errorResponse } = require('../utils/response');
const logger = require('../config/logger');

exports.protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return errorResponse(res, 'Not authorized. No token provided.', 401);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ✅ P3: Retrieve ONLY needed fields, exclude sensitive data
    const user = await User.findByPk(decoded.id, {
      attributes: ['id', 'full_name', 'email', 'role']
    });

    if (!user) {
      return errorResponse(res, 'User not found. Invalid token.', 401);
    }

    // ✅ P3: Normalize payload — map full_name → name
    // ✅ P3: Freeze to prevent mutation
    req.user = Object.freeze({
      id: user.id,
      name: user.full_name,
      email: user.email,
      role: user.role
    });

    if (process.env.NODE_ENV === 'development') {
      logger.debug({ userId: req.user.id, role: req.user.role }, 'User authenticated');
    }

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return errorResponse(res, 'Invalid token. Please log in again.', 401);
    }
    if (error.name === 'TokenExpiredError') {
      return errorResponse(res, 'Token expired. Please log in again.', 401);
    }
    next(error);
  }
};

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, 'Not authenticated', 401);
    }
    if (!roles.includes(req.user.role)) {
      return errorResponse(res, `Access denied. Requires role: ${roles.join(' or ')}`, 403);
    }
    next();
  };
};
