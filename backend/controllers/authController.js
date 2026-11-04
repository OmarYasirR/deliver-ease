const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const DriverProfile = require('../models/DriverProfile');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
});

const sendAuthResponse = (user, res, statusCode = 200) => {
  const token = signToken(user._id);
  res.cookie(process.env.COOKIE_NAME || 'dls_token', token, cookieOptions());
  res.status(statusCode).json({
    success: true,
    user: user.toSafeObject(),
  });
};

// @desc  Register a new user
// @route POST /api/auth/register
const register = asyncHandler(async (req, res) => {
  const { name, email, password, phone, role } = req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error('Name, email and password are required');
  }

  const existing = await User.findOne({ email });
  if (existing) {
    res.status(400);
    throw new Error('Email already registered');
  }

  // Only allow customer/driver self-registration; admin accounts must be provisioned separately
  const safeRole = ['customer', 'driver'].includes(role) ? role : 'customer';

  const user = await User.create({ name, email, password, phone, role: safeRole });

  if (safeRole === 'driver') {
    await DriverProfile.create({ user: user._id });
  }

  sendAuthResponse(user, res, 201);
});

// @desc  Login
// @route POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400);
    throw new Error('Email and password are required');
  }

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    res.status(401);
    throw new Error('Invalid email or password');
  }

  sendAuthResponse(user, res, 200);
});

// @desc  Logout
// @route POST /api/auth/logout
const logout = asyncHandler(async (req, res) => {
  res.cookie(process.env.COOKIE_NAME || 'dls_token', '', {
    ...cookieOptions(),
    maxAge: 0,
  });
  res.status(200).json({ success: true, message: 'Logged out' });
});

// @desc  Get current authenticated user
// @route GET /api/auth/me
const getMe = asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, user: req.user.toSafeObject() });
});

module.exports = { register, login, logout, getMe };
