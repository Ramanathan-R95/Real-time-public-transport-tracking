const axios = require('axios');

async function predictETA({ routeId, currentLat, currentLng, speed }) {
  try {
    const res = await axios.post(`${process.env.ML_SERVICE_URL}/predict`, {
      route_id: routeId,
      lat: currentLat,
      lng: currentLng,
      speed,
      hour: new Date().getHours(),
      day_of_week: new Date().getDay(),
    }, { timeout: 3000 });
    return res.data;
  } catch {
    // Fallback: naive distance/speed estimate
    return { eta_seconds: null, confidence: 0, fallback: true };
  }
}

module.exports = { predictETA };