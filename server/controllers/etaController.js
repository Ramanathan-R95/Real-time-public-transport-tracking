const { predictETA } = require('../services/etaService');
const redisService   = require('../services/redisService');

exports.getETA = async (req, res) => {
  const { routeId } = req.params;
  try {
    const state = await redisService.getVehicleState(routeId);

    if (!state?.lat) {
      return res.status(404).json({
        message: 'No active vehicle on this route',
        eta: null,
      });
    }

    const eta = await predictETA({
      routeId,
      currentLat:   state.lat,
      currentLng:   state.lng,
      currentSpeed: state.speed || 0,
    });

    res.json({ routeId, state, eta });
  } catch (err) {
    console.error('ETA error:', err);
    res.status(500).json({ message: err.message });
  }
};