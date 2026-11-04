const jwt = require('jsonwebtoken');
const cookie = require('cookie');
const User = require('../models/User');
const Order = require('../models/Order');
const DriverProfile = require('../models/DriverProfile');

/**
 * Socket.IO auth middleware: reads the JWT from the same HTTP-only cookie
 * used by the REST API, so the browser socket connection is authenticated
 * without any extra login step.
 */
const socketAuthMiddleware = async (socket, next) => {
  try {
    const rawCookie = socket.handshake.headers.cookie;
    if (!rawCookie) return next(new Error('Authentication error: no cookie'));

    const parsed = cookie.parse(rawCookie);
    const token = parsed[process.env.COOKIE_NAME || 'dls_token'];
    if (!token) return next(new Error('Authentication error: no token'));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return next(new Error('Authentication error: user not found'));

    socket.user = user;
    next();
  } catch (err) {
    next(new Error('Authentication error: ' + err.message));
  }
};

const registerSocketHandlers = (io) => {
  io.use(socketAuthMiddleware);

  io.on('connection', (socket) => {
    const { user } = socket;
    console.log(`Socket connected: ${socket.id} (${user.role} - ${user.name})`);

    // Auto-join role-scoped rooms
    if (user.role === 'admin') {
      socket.join('admins');
    }
    if (user.role === 'driver') {
      socket.join(`driver_${user._id}`);
    }

    // --- join_order: customer/admin/driver joins the room for a specific order ---
    socket.on('join_order', async ({ orderId }) => {
      if (!orderId) return;
      try {
        const order = await Order.findById(orderId);
        if (!order) return socket.emit('error_message', { message: 'Order not found' });

        const isOwner = order.customer.toString() === user._id.toString();
        const isDriver = order.driver && order.driver.toString() === user._id.toString();
        const isAdmin = user.role === 'admin';

        if (!isOwner && !isDriver && !isAdmin) {
          return socket.emit('error_message', { message: 'Not authorized for this order' });
        }

        socket.join(orderId.toString());
        socket.emit('joined_order', { orderId, currentLocation: order.currentLocation, status: order.status });
      } catch (err) {
        socket.emit('error_message', { message: 'Failed to join order room' });
      }
    });

    socket.on('leave_order', ({ orderId }) => {
      if (orderId) socket.leave(orderId.toString());
    });

    // --- update_location: driver emits live GPS coords while on an active delivery ---
    socket.on('update_location', async ({ orderId, lat, lng }) => {
      if (user.role !== 'driver') return;
      if (typeof lat !== 'number' || typeof lng !== 'number') return;

      try {
        const now = new Date();

        // Persist snapshot on the order (for reconnecting clients) and on the user
        if (orderId) {
          await Order.findByIdAndUpdate(orderId, {
            currentLocation: { lat, lng, updatedAt: now },
          });
        }
        await User.findByIdAndUpdate(user._id, {
          currentLocation: { lat, lng, updatedAt: now },
        });

        const payload = { orderId, driverId: user._id, lat, lng, updatedAt: now };

        // Broadcast to everyone tracking this specific order...
        if (orderId) io.to(orderId.toString()).emit('location_changed', payload);
        // ...and to the admin global live map
        io.to('admins').emit('location_changed', payload);
      } catch (err) {
        socket.emit('error_message', { message: 'Failed to update location' });
      }
    });

    socket.on('disconnect', async () => {
      console.log(`Socket disconnected: ${socket.id} (${user.name})`);
      if (user.role === 'driver') {
        // Mark driver offline only if they have no other active sockets
        const sockets = await io.in(`driver_${user._id}`).fetchSockets();
        if (sockets.length === 0) {
          await User.findByIdAndUpdate(user._id, { isOnline: false });
          await DriverProfile.findOneAndUpdate({ user: user._id }, { status: 'offline' });
          io.to('admins').emit('driver_presence', { driverId: user._id, isOnline: false });
        }
      }
    });
  });
};

module.exports = registerSocketHandlers;
