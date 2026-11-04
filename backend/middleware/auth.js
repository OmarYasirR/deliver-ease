const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');

// Verifies JWT from HTTP-only cookie (or Bearer header as fallback for non-browser clients)
const protect = asyncHandler(async (req, res, next) => {
  let token = req.cookies?.[process.env.COOKIE_NAME || 'dls_token'];

  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    res.status(401);
    throw new Error('Not authorized, no token provided');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      res.status(401);
      throw new Error('Not authorized, user not found or inactive');
    }
    req.user = user;
    next();
  } catch (err) {
    res.status(401);
    throw new Error('Not authorized, token invalid or expired');
  }
});

// Role-based access control
const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    res.status(403);
    throw new Error(`Role '${req.user?.role}' is not permitted to access this resource`);
  }
  next();
};

module.exports = { protect, authorize };
