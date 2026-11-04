const express = require('express');
const { createOrder, getMyOrders, getOrder, cancelOrder } = require('../controllers/orderController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.post('/', authorize('customer'), createOrder);
router.get('/my', authorize('customer'), getMyOrders);
router.get('/:id', getOrder); // ownership/role checked inside controller
router.patch('/:id/cancel', authorize('customer'), cancelOrder);

module.exports = router;
