const router = require('express').Router();
const { getETA } = require('../controllers/etaController');
const redisService = require('../services/redisService');

router.get('/buses', async (req, res) => {
  try {
    const buses = await redisService.getAllActiveBuses();
    res.json(buses);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:routeId', getETA);

module.exports = router;