const express = require('express');
const { getMetrics, getAllOrders, getDrivers, assignDriver } = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect, authorize('admin'));

router.get('/metrics', getMetrics);
router.get('/orders', getAllOrders);
router.get('/drivers', getDrivers);
router.patch('/orders/:id/assign', assignDriver);

module.exports = router;
