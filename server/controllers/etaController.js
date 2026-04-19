const etaService = require('../services/etaService');
const redisService = require('../services/redisService');

exports.getETA = async (req, res) => {
  const { routeId } = req.params;
  try {
    const state = await redisService.getVehicleState(routeId);
    if (!state) return res.status(404).json({ message: 'No active vehicle on this route' });

    const eta = await etaService.predictETA({
      routeId,
      currentLat: state.lat,
      currentLng: state.lng,
      speed: state.speed || 0,
    });
    res.json({ routeId, eta });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};