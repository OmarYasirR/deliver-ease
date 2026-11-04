const asyncHandler = require('express-async-handler');
const Order = require('../models/Order');
const User = require('../models/User');
const DriverProfile = require('../models/DriverProfile');

// @desc  Dashboard KPIs
// @route GET /api/admin/metrics
const getMetrics = asyncHandler(async (req, res) => {
  const [totalOrders, activeDeliveries, onlineDrivers, deliveredOrders] = await Promise.all([
    Order.countDocuments(),
    Order.countDocuments({ status: { $in: ['Assigned', 'Picked Up', 'In Transit'] } }),
    User.countDocuments({ role: 'driver', isOnline: true }),
    Order.find({ status: 'Delivered' }).select('price'),
  ]);

  const revenue = deliveredOrders.reduce((sum, o) => sum + (o.price || 0), 0);

  const statusBreakdown = await Order.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  res.status(200).json({
    success: true,
    metrics: {
      totalOrders,
      activeDeliveries,
      onlineDrivers,
      revenue: Math.round(revenue * 100) / 100,
      statusBreakdown,
    },
  });
});

// @desc  List all orders (with filters)
// @route GET /api/admin/orders
const getAllOrders = asyncHandler(async (req, res) => {
  const { status, unassigned } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (unassigned === 'true') filter.driver = null;

  const orders = await Order.find(filter)
    .populate('customer', 'name phone')
    .populate('driver', 'name phone currentLocation isOnline')
    .sort({ createdAt: -1 });

  res.status(200).json({ success: true, count: orders.length, orders });
});

// @desc  List all drivers with profile + online status
// @route GET /api/admin/drivers
const getDrivers = asyncHandler(async (req, res) => {
  const drivers = await User.find({ role: 'driver' }).select('-password');
  const profiles = await DriverProfile.find({ user: { $in: drivers.map((d) => d._id) } });

  const merged = drivers.map((d) => ({
    ...d.toObject(),
    profile: profiles.find((p) => p.user.toString() === d._id.toString()) || null,
  }));

  res.status(200).json({ success: true, count: merged.length, drivers: merged });
});

// @desc  Admin manually assigns/reassigns a driver to an order
// @route PATCH /api/admin/orders/:id/assign
const assignDriver = asyncHandler(async (req, res) => {
  const { driverId } = req.body;
  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  const driver = await User.findOne({ _id: driverId, role: 'driver' });
  if (!driver) {
    res.status(404);
    throw new Error('Driver not found');
  }

  // Free previous driver, if reassigning
  if (order.driver && order.driver.toString() !== driverId) {
    await DriverProfile.findOneAndUpdate({ user: order.driver }, { status: 'available', activeOrder: null });
  }

  order.driver = driver._id;
  order.status = 'Assigned';
  await order.save();

  await DriverProfile.findOneAndUpdate(
    { user: driver._id },
    { status: 'busy', activeOrder: order._id },
    { upsert: true }
  );

  const io = req.app.get('io');
  io?.to(order._id.toString()).emit('status_change', {
    orderId: order._id,
    status: 'Assigned',
    driver: { id: driver._id, name: driver.name, phone: driver.phone },
  });
  io?.to('admins').emit('order_updated', order);
  io?.to(`driver_${driver._id}`).emit('job_offer', order);

  res.status(200).json({ success: true, order });
});

module.exports = { getMetrics, getAllOrders, getDrivers, assignDriver };
