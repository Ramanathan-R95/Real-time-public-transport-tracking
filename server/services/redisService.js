let redis;

function init(client) { redis = client; }

async function setVehicleState(routeId, data) {
  await redis.set(`vehicle:${routeId}`, JSON.stringify(data), 'EX', 300);
}

async function getVehicleState(routeId) {
  const raw = await redis.get(`vehicle:${routeId}`);
  return raw ? JSON.parse(raw) : null;
}

async function deleteVehicleState(routeId) {
  await redis.del(`vehicle:${routeId}`);
}

async function pushPingHistory(routeId, ping) {
  const key = `history:${routeId}`;
  await redis.lpush(key, JSON.stringify(ping));
  await redis.ltrim(key, 0, 49);
  await redis.expire(key, 3600);
}

async function getPingHistory(routeId) {
  const items = await redis.lrange(`history:${routeId}`, 0, -1);
  return items.map(JSON.parse);
}

// Track active buses: driverId -> { routeId, driverName, vehicleNumber, lat, lng, timestamp }
async function setActiveBus(driverId, data) {
  await redis.hset('active_buses', driverId, JSON.stringify(data));
}

async function removeActiveBus(driverId) {
  await redis.hdel('active_buses', driverId);
}

async function getAllActiveBuses() {
  const raw = await redis.hgetall('active_buses');
  if (!raw) return [];
  return Object.entries(raw).map(([driverId, val]) => ({ driverId, ...JSON.parse(val) }));
}

module.exports = {
  init,
  setVehicleState,
  getVehicleState,
  deleteVehicleState,
  pushPingHistory,
  getPingHistory,
  setActiveBus,
  removeActiveBus,
  getAllActiveBuses,
};