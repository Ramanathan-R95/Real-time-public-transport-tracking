const { getClient } = require('../config/redis');

const r = () => getClient();

// ── Safely parse a value that may already be an object ──
function safeJson(val) {
  if (!val) return null;
  if (typeof val === 'object') return val;   // Upstash already parsed it
  try { return JSON.parse(val); }
  catch { return null; }
}

// ── Vehicle state ──
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

// ── Ping history ──
async function pushPingHistory(routeId, ping) {
  const key = `history:${routeId}`;
  await r().lpush(key, JSON.stringify(ping));
  await r().ltrim(key, 0, 49);
  await r().expire(key, 3600);
}

async function getPingHistory(routeId) {
  const items = await r().lrange(`history:${routeId}`, 0, -1);
  if (!items?.length) return [];
  return items.map(safeJson).filter(Boolean);
}

// ── Active buses ──
async function setActiveBus(driverId, data) {
  // Always store as a JSON string — both ioredis and Upstash handle this
  await r().hset('active_buses', { [driverId]: JSON.stringify(data) });
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
    }
    // silently skip corrupted entries — no more console spam
  }

  return buses;
}

// ── Clear all stale bus data (call on server start) ──
async function clearActiveBuses() {
  try {
    await r().del('active_buses');
    console.log('Cleared stale active_buses from Redis');
  } catch {}
}

module.exports = {
  setVehicleState,
  getVehicleState,
  deleteVehicleState,
  pushPingHistory,
  getPingHistory,
  setActiveBus,
  removeActiveBus,
  getAllActiveBuses,
  clearActiveBuses,
};