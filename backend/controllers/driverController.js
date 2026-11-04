const asyncHandler = require('express-async-handler');
const Order = require('../models/Order');
const DriverProfile = require('../models/DriverProfile');
const User = require('../models/User');

// @desc  List orders offered/available to this driver (Pending + unassigned, or assigned to them)
// @route GET /api/driver/jobs
const getAvailableJobs = asyncHandler(async (req, res) => {
  const orders = await Order.find({
    $or: [
      { status: 'Pending', driver: null },
      { driver: req.user._id, status: { $in: ['Assigned', 'Picked Up', 'In Transit'] } },
    ],
  })
    .populate('customer', 'name phone')
    .sort({ createdAt: -1 });

  res.status(200).json({ success: true, count: orders.length, orders });
});

// @desc  Driver accepts a pending order
// @route PATCH /api/driver/jobs/:id/accept
const acceptJob = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }
  if (order.status !== 'Pending' || order.driver) {
    res.status(400);
    throw new Error('Order is no longer available for assignment');
  }

  const profile = await DriverProfile.findOne({ user: req.user._id });
  if (profile?.status === 'busy') {
    res.status(400);
    throw new Error('You already have an active delivery');
  }

  order.driver = req.user._id;
  order.status = 'Assigned';
  await order.save();

  await DriverProfile.findOneAndUpdate(
    { user: req.user._id },
    { status: 'busy', activeOrder: order._id },
    { upsert: true }
  );

  const io = req.app.get('io');
  io?.to(order._id.toString()).emit('status_change', {
    orderId: order._id,
    status: 'Assigned',
    driver: { id: req.user._id, name: req.user.name, phone: req.user.phone },
  });
  io?.to('admins').emit('order_updated', order);

  res.status(200).json({ success: true, order });
});

// @desc  Driver rejects a pending order (no-op on the order itself; just informs admin)
// @route PATCH /api/driver/jobs/:id/reject
const rejectJob = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }
  const io = req.app.get('io');
  io?.to('admins').emit('job_rejected', { orderId: order._id, driverId: req.user._id });
  res.status(200).json({ success: true, message: 'Job rejected' });
});

const VALID_TRANSITIONS = {
  Assigned: ['Picked Up', 'Cancelled'],
  'Picked Up': ['In Transit', 'Cancelled'],
  'In Transit': ['Delivered'],
};

// @desc  Driver updates lifecycle status of their active order
// @route PATCH /api/driver/jobs/:id/status
const updateJobStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const order = await Order.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }
  if (!order.driver || order.driver.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized for this order');
  }

  const allowed = VALID_TRANSITIONS[order.status] || [];
  if (!allowed.includes(status)) {
    res.status(400);
    throw new Error(`Cannot transition from ${order.status} to ${status}`);
  }

  order.status = status;
  await order.save();

  if (status === 'Delivered') {
    await DriverProfile.findOneAndUpdate(
      { user: req.user._id },
      { status: 'available', activeOrder: null, $inc: { completedDeliveries: 1 } }
    );
    await User.findByIdAndUpdate(req.user._id, { isOnline: true });
  }

  const io = req.app.get('io');
  io?.to(order._id.toString()).emit('status_change', { orderId: order._id, status });
  io?.to('admins').emit('order_updated', order);

  res.status(200).json({ success: true, order });
});

// @desc  Driver toggles online/offline availability
// @route PATCH /api/driver/online-status
const setOnlineStatus = asyncHandler(async (req, res) => {
  const { isOnline } = req.body;
  await User.findByIdAndUpdate(req.user._id, { isOnline: !!isOnline });
  await DriverProfile.findOneAndUpdate(
    { user: req.user._id },
    { status: isOnline ? 'available' : 'offline' },
    { upsert: true }
  );

  const io = req.app.get('io');
  io?.to('admins').emit('driver_presence', { driverId: req.user._id, isOnline: !!isOnline });

  res.status(200).json({ success: true, isOnline: !!isOnline });
});

module.exports = { getAvailableJobs, acceptJob, rejectJob, updateJobStatus, setOnlineStatus };
