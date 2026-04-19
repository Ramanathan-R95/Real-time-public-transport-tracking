const router = require('express').Router();
const auth = require('../middleware/auth');
const { getMe, updateStatus } = require('../controllers/driverController');
const TripLog = require('../models/TripLog');

router.get('/me', auth, getMe);
router.patch('/status', auth, updateStatus);

// Trip history for logged-in driver
router.get('/my-trips', auth, async (req, res) => {
  try {
    const trips = await TripLog.find({ driver: req.driver.id })
      .populate('route', 'routeName routeNumber')
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(trips);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;