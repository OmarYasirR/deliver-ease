const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema(
  {
    label: { type: String, trim: true },
    line1: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  { _id: false }
);

const statusHistorySchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    changedAt: { type: Date, default: Date.now },
    note: { type: String },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    pickupAddress: { type: addressSchema, required: true },
    deliveryAddress: { type: addressSchema, required: true },

    parcel: {
      weightKg: { type: Number, required: true, min: 0.01 },
      dimensions: {
        lengthCm: Number,
        widthCm: Number,
        heightCm: Number,
      },
      instructions: { type: String, trim: true },
    },

    priority: {
      type: String,
      enum: ['standard', 'express', 'urgent'],
      default: 'standard',
    },

    status: {
      type: String,
      enum: ['Pending', 'Assigned', 'Picked Up', 'In Transit', 'Delivered', 'Cancelled'],
      default: 'Pending',
    },
    statusHistory: { type: [statusHistorySchema], default: [] },

    // Live tracking snapshot (also broadcast via socket, persisted for reconnects)
    currentLocation: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
      updatedAt: { type: Date, default: null },
    },

    route: {
      // Array of [lat,lng] waypoints for drawing the route on the map.
      // Populated from OSRM (real driving route) when available, otherwise
      // falls back to a straight line between pickup and delivery.
      waypoints: { type: [[Number]], default: [] },
      distanceMeters: { type: Number, default: null },
      durationSeconds: { type: Number, default: null },
      source: { type: String, enum: ['osrm', 'straight_line'], default: 'straight_line' },
    },

    price: { type: Number, default: 0 },
    isPaid: { type: Boolean, default: false },

    cancelReason: { type: String },
  },
  { timestamps: true }
);

orderSchema.pre('save', function trackStatusHistory(next) {
  if (this.isModified('status') || this.isNew) {
    this.statusHistory.push({ status: this.status, changedAt: new Date() });
  }
  next();
});

orderSchema.index({ customer: 1, createdAt: -1 });
orderSchema.index({ driver: 1, status: 1 });

module.exports = mongoose.model('Order', orderSchema);
