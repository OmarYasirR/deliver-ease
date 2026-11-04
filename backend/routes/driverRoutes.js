const express = require('express');
const {
  getAvailableJobs,
  acceptJob,
  rejectJob,
  updateJobStatus,
  setOnlineStatus,
} = require('../controllers/driverController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect, authorize('driver'));

router.get('/jobs', getAvailableJobs);
router.patch('/jobs/:id/accept', acceptJob);
router.patch('/jobs/:id/reject', rejectJob);
router.patch('/jobs/:id/status', updateJobStatus);
router.patch('/online-status', setOnlineStatus);

module.exports = router;
