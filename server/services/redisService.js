const { getClient } = require('../config/redis');

const r = () => getClient();

function safeJson(val) {
  if (!val) return null;
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch { return null; }
}

async function setVehicleState(routeId, data) {
  try {
    await r().set(`vehicle:${routeId}`, JSON.stringify(data), { ex: 300 });
  } catch (err) {
    console.error('[Redis] setVehicleState error:', err.message);
  }
}

async function getVehicleState(routeId) {
  try {
    const raw = await r().get(`vehicle:${routeId}`);
    return safeJson(raw);
  } catch { return null; }
}

async function deleteVehicleState(routeId) {
  try { await r().del(`vehicle:${routeId}`); } catch {}
}

async function pushPingHistory(routeId, ping) {
  try {
    const key = `history:${routeId}`;
    await r().lpush(key, JSON.stringify(ping));
    await r().ltrim(key, 0, 49);
    await r().expire(key, 3600);
  } catch (err) {
    console.error('[Redis] pushPingHistory error:', err.message);
  }
}

async function getPingHistory(routeId) {
  try {
    const items = await r().lrange(`history:${routeId}`, 0, -1);
    return (items || []).map(safeJson).filter(Boolean);
  } catch { return []; }
}

async function setActiveBus(driverId, data) {
  try {
    const str = JSON.stringify(data);
    console.log(`[Redis] setActiveBus: driverId=${driverId} lat=${data.lat} lng=${data.lng}`);
    // Try both Upstash and ioredis compatible syntax
    const client = r();
    if (typeof client.hset === 'function') {
      // Upstash: hset(key, { field: value })
      // ioredis: hset(key, field, value)
      // Use a try for each
      try {
        await client.hset('active_buses', { [driverId]: str });
      } catch {
        await client.hset('active_buses', driverId, str);
      }
    }
    // Verify
    const check = await getAllActiveBuses();
    console.log(`[Redis] After setActiveBus, total active:`, check.length);
  } catch (err) {
    console.error('[Redis] setActiveBus error:', err.message);
  }
}

async function removeActiveBus(driverId) {
  try { await r().hdel('active_buses', driverId); } catch {}
}

async function getAllActiveBuses() {
  try {
    const raw = await r().hgetall('active_buses');
    if (!raw) return [];
    const buses = [];
    for (const [driverId, val] of Object.entries(raw)) {
      const parsed = safeJson(val);
      if (parsed && typeof parsed === 'object') {
        buses.push({ driverId, ...parsed });
      }
    }
    return buses;
  } catch (err) {
    console.error('[Redis] getAllActiveBuses error:', err.message);
    return [];
  }
}

async function clearActiveBuses() {
  try {
    await r().del('active_buses');
    console.log('[Redis] Cleared active_buses');
  } catch {}
}

module.exports = {
  setVehicleState, getVehicleState, deleteVehicleState,
  pushPingHistory, getPingHistory,
  setActiveBus, removeActiveBus, getAllActiveBuses, clearActiveBuses,
};