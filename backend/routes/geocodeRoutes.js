const express = require('express');
const { searchAddress } = require('../controllers/geocodeController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/search', protect, searchAddress);

module.exports = router;
