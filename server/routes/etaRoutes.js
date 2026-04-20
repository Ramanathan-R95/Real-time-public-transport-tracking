const router       = require('express').Router();
const { getETA }   = require('../controllers/etaController');
const redisService = require('../services/redisService');
const SegmentStats = require('../models/SegmentStats');

// Active buses
router.get('/buses', async (req, res) => {
  try {
    const buses = await redisService.getAllActiveBuses();
    res.json(buses);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Segment stats for a route (for admin/debug)
router.get('/segments/:routeId', async (req, res) => {
  try {
    const segs = await SegmentStats.find({ routeId: req.params.routeId });
    res.json(segs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ETA for a route
router.get('/:routeId', getETA);

module.exports = router;