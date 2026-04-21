const { getClient } = require('../config/redis');

const r = () => getClient();

function safeJson(val) {
  if (!val) return null;
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch { return null; }
}

async function setVehicleState(routeId, data) {
  await r().set(`vehicle:${routeId}`, JSON.stringify(data), { ex: 300 });
}

async function getVehicleState(routeId) {
  const raw = await r().get(`vehicle:${routeId}`);
  return safeJson(raw);
}

async function deleteVehicleState(routeId) {
  await r().del(`vehicle:${routeId}`);
}

async function pushPingHistory(routeId, ping) {
  const key = `history:${routeId}`;
  await r().lpush(key, JSON.stringify(ping));
  await r().ltrim(key, 0, 49);
  await r().expire(key, 3600);
}

async function getPingHistory(routeId) {
  const items = await r().lrange(`history:${routeId}`, 0, -1);
  return (items || []).map(safeJson).filter(Boolean);
}

async function setActiveBus(driverId, data) {
  const str = JSON.stringify(data);
  console.log(`[Redis] setActiveBus driverId=${driverId} data=${str.slice(0, 100)}`);
  await r().hset('active_buses', { [driverId]: str });
}

async function removeActiveBus(driverId) {
  await r().hdel('active_buses', driverId);
}

async function getAllActiveBuses() {
  const raw = await r().hgetall('active_buses');
  if (!raw) return [];

  const buses = [];
  for (const [driverId, val] of Object.entries(raw)) {
    const parsed = safeJson(val);
    if (parsed && typeof parsed === 'object') {
      buses.push({ driverId, ...parsed });
    } else {
      console.warn(`[Redis] Bad value for driverId=${driverId}:`, val);
    }
  }
  return buses;
}

async function clearActiveBuses() {
  await r().del('active_buses');
}

module.exports = {
  setVehicleState, getVehicleState, deleteVehicleState,
  pushPingHistory, getPingHistory,
  setActiveBus, removeActiveBus, getAllActiveBuses, clearActiveBuses,
};