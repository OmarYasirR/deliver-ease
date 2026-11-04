const asyncHandler = require('express-async-handler');
const Order = require('../models/Order');
const DriverProfile = require('../models/DriverProfile');
const { getDrivingRoute } = require('../utils/osrm');

const PRIORITY_PRICE = { standard: 5, express: 9, urgent: 15 };
const PER_KM_RATE = 0.6;

const calcPrice = (weightKg, priority, distanceMeters) => {
  const base = PRIORITY_PRICE[priority] || PRIORITY_PRICE.standard;
  const distanceCost = distanceMeters ? (distanceMeters / 1000) * PER_KM_RATE : 0;
  return Math.round((base + weightKg * 0.8 + distanceCost) * 100) / 100;
};

// @desc  Customer creates a new order
// @route POST /api/orders
// @access customer
const createOrder = asyncHandler(async (req, res) => {
  const { pickupAddress, deliveryAddress, parcel, priority } = req.body;

  if (!pickupAddress || !deliveryAddress || !parcel?.weightKg) {
    res.status(400);
    throw new Error('Pickup address, delivery address and parcel weight are required');
  }

  // Try to get a real driving route from OSRM; fall back to a straight line
  // between the two points if the routing service is unreachable.
  const osrmResult = await getDrivingRoute(
    { lat: pickupAddress.lat, lng: pickupAddress.lng },
    { lat: deliveryAddress.lat, lng: deliveryAddress.lng }
  );

  const route = osrmResult
    ? {
        waypoints: osrmResult.waypoints,
        distanceMeters: osrmResult.distanceMeters,
        durationSeconds: osrmResult.durationSeconds,
        source: 'osrm',
      }
    : {
        waypoints: [
          [pickupAddress.lat, pickupAddress.lng],
          [deliveryAddress.lat, deliveryAddress.lng],
        ],
        source: 'straight_line',
      };

  const order = await Order.create({
    customer: req.user._id,
    pickupAddress,
    deliveryAddress,
    parcel,
    priority: priority || 'standard',
    price: calcPrice(parcel.weightKg, priority, osrmResult?.distanceMeters),
    route,
  });

  // Notify admin dashboard of a new unassigned order
  const io = req.app.get('io');
  io?.to('admins').emit('new_order', order);

  res.status(201).json({ success: true, order });
});

// @desc  Customer's own order history
// @route GET /api/orders/my
// @access customer
const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ customer: req.user._id })
    .populate('driver', 'name phone currentLocation')
    .sort({ createdAt: -1 });
  res.status(200).json({ success: true, count: orders.length, orders });
});

// @desc  Get single order (customer who owns it, assigned driver, or admin)
// @route GET /api/orders/:id
const getOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('customer', 'name phone')
    .populate('driver', 'name phone currentLocation');

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  const isOwner = order.customer._id.toString() === req.user._id.toString();
  const isAssignedDriver = order.driver && order.driver._id.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'admin';

  if (!isOwner && !isAssignedDriver && !isAdmin) {
    res.status(403);
    throw new Error('Not authorized to view this order');
  }

  res.status(200).json({ success: true, order });
});

// @desc  Customer cancels a pending/unassigned order
// @route PATCH /api/orders/:id/cancel
const cancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }
  if (order.customer.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized');
  }
  if (['Delivered', 'Cancelled'].includes(order.status)) {
    res.status(400);
    throw new Error(`Cannot cancel an order that is already ${order.status}`);
  }

  order.status = 'Cancelled';
  order.cancelReason = req.body.reason || 'Cancelled by customer';
  await order.save();

  // Free up the driver, if one was assigned
  if (order.driver) {
    await DriverProfile.findOneAndUpdate({ user: order.driver }, { status: 'available', activeOrder: null });
  }

  const io = req.app.get('io');
  io?.to(order._id.toString()).emit('status_change', { orderId: order._id, status: 'Cancelled' });

  res.status(200).json({ success: true, order });
});

module.exports = { createOrder, getMyOrders, getOrder, cancelOrder };
