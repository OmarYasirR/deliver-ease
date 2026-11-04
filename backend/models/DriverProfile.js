const mongoose = require('mongoose');

const driverProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    vehicleType: { type: String, enum: ['bike', 'car', 'van', 'truck'], default: 'bike' },
    vehiclePlate: { type: String, trim: true },
    licenseNumber: { type: String, trim: true },
    rating: { type: Number, default: 5, min: 0, max: 5 },
    completedDeliveries: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['offline', 'available', 'busy'],
      default: 'offline',
    },
    activeOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('DriverProfile', driverProfileSchema);
