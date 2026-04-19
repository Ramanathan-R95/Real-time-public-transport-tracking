const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const redisService = require('./redisService');
const { broadcast } = require('./sseService');
const { flushBuffer, inferSpeed } = require('./bufferService');
const TripLog = require('../models/TripLog');
const Driver = require('../models/Driver');
const etaService = require('./etaService');

function initWSServer(server, redisClient) {
  redisService.init(redisClient);

  const wss = new WebSocket.Server({ server, path: '/ws' });

  wss.on('connection', async (ws, req) => {
    const url = new URL(req.url, `http://localhost`);
    const token = url.searchParams.get('token');

    let driver = null;
    try {
      driver = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      ws.close(4001, 'Unauthorized');
      return;
    }

    // Fetch full driver info
    const driverDoc = await Driver.findById(driver.id).select('name vehicleNumber assignedRoute');

    console.log(`Driver connected: ${driver.email}`);
    ws.driverId = driver.id;
    ws.routeId = null;
    ws.lastPing = null;

    ws.send(JSON.stringify({ type: 'auth_ok', driverId: driver.id }));

    ws.on('message', async (raw) => {
      let msg;
      try { msg = JSON.parse(raw); } catch { return; }

      switch (msg.type) {

        case 'trip_start': {
          ws.routeId = msg.routeId;
          const trip = await TripLog.create({
            driver: driver.id,
            route: msg.routeId,
            status: 'active',
          });
          ws.tripId = trip._id.toString();

          const busData = {
            routeId: msg.routeId,
            driverName: driverDoc?.name || 'Driver',
            vehicleNumber: driverDoc?.vehicleNumber || '',
            lat: null,
            lng: null,
            timestamp: new Date().toISOString(),
          };

          await redisService.setVehicleState(msg.routeId, {
            lat: null, lng: null, status: 'started', driverId: driver.id,
          });
          await redisService.setActiveBus(driver.id, busData);

          ws.send(JSON.stringify({ type: 'trip_started', tripId: ws.tripId }));
          broadcast(msg.routeId, 'trip_status', { status: 'started', driverId: driver.id });

          // Broadcast updated bus list to all
          const buses = await redisService.getAllActiveBuses();
          broadcast('__all__', 'buses_update', buses);
          break;
        }

        case 'ping': {
          if (!ws.routeId) break;
          const { lat, lng, accuracy, timestamp } = msg;
          const speed = inferSpeed(ws.lastPing, { lat, lng, timestamp });
          const pingData = { lat, lng, accuracy, timestamp, speed };
          ws.lastPing = pingData;

          await redisService.setVehicleState(ws.routeId, {
            lat, lng, accuracy, speed, timestamp, driverId: driver.id,
          });
          await redisService.pushPingHistory(ws.routeId, pingData);

          // Update active bus position
          await redisService.setActiveBus(driver.id, {
            routeId: ws.routeId,
            driverName: driverDoc?.name || 'Driver',
            vehicleNumber: driverDoc?.vehicleNumber || '',
            lat, lng, timestamp,
          });

          await TripLog.findByIdAndUpdate(ws.tripId, {
            $push: { pings: pingData },
          });

          const eta = await etaService.predictETA({
            routeId: ws.routeId, currentLat: lat, currentLng: lng, speed,
          });

          broadcast(ws.routeId, 'position', { lat, lng, accuracy, speed, timestamp, eta });

          // Broadcast updated bus list
          const buses = await redisService.getAllActiveBuses();
          broadcast('__all__', 'buses_update', buses);

          ws.send(JSON.stringify({ type: 'ping_ack', timestamp }));
          break;
        }

        case 'buffer_flush': {
          if (!ws.routeId) break;
          await flushBuffer(driver.id, ws.routeId, msg.pings);
          const last = msg.pings[msg.pings.length - 1];
          if (last) broadcast(ws.routeId, 'position', { ...last, buffered: true });
          ws.send(JSON.stringify({ type: 'flush_ack', count: msg.pings.length }));
          break;
        }

        case 'trip_end': {
          if (!ws.tripId) break;
          await TripLog.findByIdAndUpdate(ws.tripId, {
            status: 'completed', endTime: new Date(),
          });
          await redisService.deleteVehicleState(ws.routeId);
          await redisService.removeActiveBus(driver.id);

          broadcast(ws.routeId, 'trip_status', { status: 'ended' });

          const buses = await redisService.getAllActiveBuses();
          broadcast('__all__', 'buses_update', buses);

          ws.send(JSON.stringify({ type: 'trip_ended' }));
          ws.routeId = null;
          ws.tripId = null;
          break;
        }
      }
    });

    ws.on('close', async () => {
      console.log(`Driver disconnected: ${driver.email}`);
      if (ws.routeId) {
        broadcast(ws.routeId, 'trip_status', { status: 'driver_disconnected' });
        await redisService.removeActiveBus(driver.id);
        const buses = await redisService.getAllActiveBuses();
        broadcast('__all__', 'buses_update', buses);
      }
    });
  });
}

module.exports = { initWSServer };