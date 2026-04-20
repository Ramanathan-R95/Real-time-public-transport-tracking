const WebSocket    = require('ws');
const jwt          = require('jsonwebtoken');
const redisService = require('./redisService');
const { broadcast }          = require('./sseService');
const { flushBuffer, inferSpeed } = require('./bufferService');
const { predictETA, learnFromTrip } = require('./etaService');
const TripLog  = require('../models/TripLog');
const Driver   = require('../models/Driver');

function initWSServer(server) {
  // No redis param needed — redisService uses getClient() internally
  const wss = new WebSocket.Server({ server, path: '/ws' });

  wss.on('connection', async (ws, req) => {
    const url   = new URL(req.url, 'http://localhost');
    const token = url.searchParams.get('token');

    let driverPayload = null;
    try {
      driverPayload = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      ws.close(4001, 'Unauthorized');
      return;
    }

    const driverDoc = await Driver.findById(driverPayload.id)
      .select('name vehicleNumber assignedRoute');

    console.log(`[WS] Driver connected: ${driverPayload.email}`);

    ws.driverId  = driverPayload.id;
    ws.routeId   = null;
    ws.tripId    = null;
    ws.lastPing  = null;
    ws.isAlive   = true;

    ws.send(JSON.stringify({ type: 'auth_ok', driverId: driverPayload.id }));

    // Ping/pong heartbeat to detect stale connections
    ws.on('pong', () => { ws.isAlive = true; });

    ws.on('message', async (raw) => {
      let msg;
      try { msg = JSON.parse(raw); } catch { return; }

      switch (msg.type) {

        case 'trip_start': {
          ws.routeId = msg.routeId;
          const trip = await TripLog.create({
            driver: driverPayload.id,
            route:  msg.routeId,
            status: 'active',
            startTime: new Date(),
          });
          ws.tripId = trip._id.toString();

          await redisService.setVehicleState(msg.routeId, {
            lat: null, lng: null,
            status: 'started',
            driverId: driverPayload.id,
          });

          await redisService.setActiveBus(driverPayload.id, {
            routeId:       msg.routeId,
            driverName:    driverDoc?.name || 'Driver',
            vehicleNumber: driverDoc?.vehicleNumber || '',
            lat: null, lng: null,
            timestamp: new Date().toISOString(),
          });

          ws.send(JSON.stringify({ type: 'trip_started', tripId: ws.tripId }));
          broadcast(msg.routeId, 'trip_status', {
            status: 'started', driverId: driverPayload.id,
          });

          const buses = await redisService.getAllActiveBuses();
          broadcast('__all__', 'buses_update', buses);
          break;
        }

        case 'ping': {
          if (!ws.routeId) break;

          const { lat, lng, accuracy, timestamp } = msg;
          const speed    = inferSpeed(ws.lastPing, { lat, lng, timestamp });
          const pingData = { lat, lng, accuracy, timestamp, speed };
          ws.lastPing    = pingData;

          // Update Redis and MongoDB concurrently
          await Promise.all([
            redisService.setVehicleState(ws.routeId, {
              lat, lng, accuracy, speed, timestamp,
              driverId: driverPayload.id,
            }),
            redisService.pushPingHistory(ws.routeId, pingData),
            redisService.setActiveBus(driverPayload.id, {
              routeId:       ws.routeId,
              driverName:    driverDoc?.name || 'Driver',
              vehicleNumber: driverDoc?.vehicleNumber || '',
              lat, lng, timestamp,
            }),
            TripLog.findByIdAndUpdate(ws.tripId, {
              $push: { pings: pingData },
            }),
          ]);

          // Compute ETA async — don't await, broadcast when ready
          predictETA({
            routeId:      ws.routeId,
            currentLat:   lat,
            currentLng:   lng,
            currentSpeed: speed,
          }).then(async (eta) => {
            broadcast(ws.routeId, 'position', {
              lat, lng, accuracy, speed, timestamp, eta,
            });
            const buses = await redisService.getAllActiveBuses();
            broadcast('__all__', 'buses_update', buses);
          }).catch(() => {
            broadcast(ws.routeId, 'position', {
              lat, lng, accuracy, speed, timestamp, eta: null,
            });
          });

          ws.send(JSON.stringify({ type: 'ping_ack', timestamp }));
          break;
        }

        case 'buffer_flush': {
          if (!ws.routeId || !msg.pings?.length) break;
          await flushBuffer(driverPayload.id, ws.routeId, msg.pings);
          const last = msg.pings[msg.pings.length - 1];
          if (last) {
            broadcast(ws.routeId, 'position', { ...last, buffered: true });
          }
          ws.send(JSON.stringify({ type: 'flush_ack', count: msg.pings.length }));
          break;
        }

        case 'trip_end': {
          if (!ws.tripId) break;

          const trip = await TripLog.findById(ws.tripId);

          await Promise.all([
            TripLog.findByIdAndUpdate(ws.tripId, {
              status: 'completed', endTime: new Date(),
            }),
            redisService.deleteVehicleState(ws.routeId),
            redisService.removeActiveBus(driverPayload.id),
          ]);

          broadcast(ws.routeId, 'trip_status', { status: 'ended' });

          const buses = await redisService.getAllActiveBuses();
          broadcast('__all__', 'buses_update', buses);

          ws.send(JSON.stringify({ type: 'trip_ended' }));

          // Learn from trip data asynchronously
          if (trip?.pings?.length >= 2) {
            learnFromTrip(ws.routeId, trip.pings).catch(console.error);
          }

          ws.routeId = null;
          ws.tripId  = null;
          break;
        }
      }
    });

    ws.on('close', async () => {
      console.log(`[WS] Driver disconnected: ${driverPayload.email}`);
      if (ws.routeId) {
        broadcast(ws.routeId, 'trip_status', { status: 'driver_disconnected' });
        await redisService.removeActiveBus(driverPayload.id).catch(() => {});
        const buses = await redisService.getAllActiveBuses();
        broadcast('__all__', 'buses_update', buses);
      }
    });

    ws.on('error', (err) => {
      console.error(`[WS] Error for ${driverPayload.email}:`, err.message);
    });
  });

  // Stale connection cleanup every 30s
  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (!ws.isAlive) { ws.terminate(); return; }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => clearInterval(interval));
  console.log('[WS] WebSocket server ready at /ws');
}

module.exports = { initWSServer };