const TripLog = require('../models/TripLog');
const redisService = require('./redisService');
const { haversine } = require('../utils/geoHelpers');

// Called when driver reconnects and sends buffered pings
async function flushBuffer(driverId, routeId, pings) {
  if (!pings || pings.length === 0) return;

  // Sort by timestamp to restore correct order
  pings.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  // Save to TripLog
  await TripLog.findOneAndUpdate(
    { driver: driverId, route: routeId, status: 'active' },
    { $push: { pings: { $each: pings } } },
    { upsert: true, new: true }
  );

  // Update Redis with the last known position from the buffer
  const last = pings[pings.length - 1];
  await redisService.setVehicleState(routeId, {
    lat: last.lat,
    lng: last.lng,
    speed: last.speed || 0,
    accuracy: last.accuracy,
    timestamp: last.timestamp,
    buffered: true,
  });

  console.log(`Flushed ${pings.length} buffered pings for route ${routeId}`);
}

// Compute speed from two consecutive pings
function inferSpeed(prev, curr) {
  if (!prev) return 0;
  const dist = haversine(prev.lat, prev.lng, curr.lat, curr.lng);
  const dt = (new Date(curr.timestamp) - new Date(prev.timestamp)) / 1000;
  return dt > 0 ? dist / dt : 0; // m/s
}

module.exports = { flushBuffer, inferSpeed };