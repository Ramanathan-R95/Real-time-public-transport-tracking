const WebSocket    = require('ws');
const jwt          = require('jsonwebtoken');
const redisService = require('./redisService');
const { flushBuffer, inferSpeed } = require('./bufferService');
const { learnFromTrip } = require('./etaService');
const TripLog = require('../models/TripLog');
const Driver  = require('../models/Driver');

// ETA computed every 6th ping — heavier DB query
const ETA_EVERY = 6;

// MongoDB trip log saved every 2nd ping — reduces writes
const MONGO_EVERY = 2;

function initWSServer(server) {
  const wss = new WebSocket.Server({ server, path: '/ws' });
  console.log('[WS] Server ready at /ws');

  wss.on('connection', async (ws, req) => {
    const url   = new URL(req.url, 'http://localhost');
    const token = url.searchParams.get('token');

    let payload = null;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      ws.close(4001, 'Unauthorized');
      return;
    }

    const driverDoc = await Driver.findById(payload.id)
      .select('name vehicleNumber assignedRoute');

    console.log(`[WS] Connected: ${payload.email}`);

    ws.driverId  = payload.id;
    ws.routeId   = null;
    ws.tripId    = null;
    ws.lastPing  = null;
    ws.isAlive   = true;
    ws.pingsSent = 0;

    ws.send(JSON.stringify({ type: 'auth_ok', driverId: payload.id }));
    ws.on('pong', () => { ws.isAlive = true; });

    ws.on('message', async (raw) => {
      let msg;
      try { msg = JSON.parse(raw.toString()); }
      catch { return; }

      switch (msg.type) {

        case 'trip_start': {
          ws.routeId   = msg.routeId;
          ws.pingsSent = 0;

          const trip = await TripLog.create({
            driver: payload.id, route: msg.routeId,
            status: 'active', startTime: new Date(),
          });
          ws.tripId = trip._id.toString();

          const busData = {
            routeId:       msg.routeId,
            driverName:    driverDoc?.name        || 'Driver',
            vehicleNumber: driverDoc?.vehicleNumber || 'BUS',
            lat: null, lng: null, speed: 0,
            timestamp: new Date().toISOString(),
          };

          await redisService.setActiveBus(payload.id, busData);
          await redisService.setVehicleState(msg.routeId, { ...busData, driverId: payload.id });

          const buses = await redisService.getAllActiveBuses();
          global.setBusCache(buses);

          ws.send(JSON.stringify({ type: 'trip_started', tripId: ws.tripId }));

          const { broadcast } = require('./sseService');
          broadcast(msg.routeId, 'trip_status', { status: 'started', driverId: payload.id });
          broadcast('__all__', 'buses_update', buses);
          break;
        }

        case 'ping': {
          if (!ws.routeId) break;

          const { lat, lng, accuracy, timestamp, speed: rawSpeed } = msg;
          if (lat === undefined || lng === undefined) break;

          const speed    = rawSpeed || inferSpeed(ws.lastPing, { lat, lng, timestamp });
          const pingData = {
            lat:       Number(lat),
            lng:       Number(lng),
            accuracy:  accuracy || 0,
            timestamp: timestamp || new Date().toISOString(),
            speed,
          };
          ws.lastPing  = pingData;
          ws.pingsSent += 1;

          const busData = {
            routeId:       ws.routeId,
            driverName:    driverDoc?.name        || 'Driver',
            vehicleNumber: driverDoc?.vehicleNumber || 'BUS',
            lat:       Number(lat),
            lng:       Number(lng),
            speed,
            timestamp: pingData.timestamp,
          };

          // ── Always update Redis position (lightweight) ──
          const redisOps = [
            redisService.setVehicleState(ws.routeId, { ...busData, driverId: payload.id }),
            redisService.setActiveBus(payload.id, busData),
          ];

          // ── MongoDB only every 2nd ping ──
          if (ws.pingsSent % MONGO_EVERY === 0) {
            redisOps.push(
              TripLog.findByIdAndUpdate(ws.tripId, { $push: { pings: pingData } })
            );
          }

          await Promise.all(redisOps);

          // Update memory cache without Redis call
          const cachedBuses = await global.getBuses();
          const updatedBuses = cachedBuses.map((b) =>
            b.driverId === payload.id ? { ...b, ...busData } : b
          );
          if (!updatedBuses.find((b) => b.driverId === payload.id)) {
            updatedBuses.push({ driverId: payload.id, ...busData });
          }
          global.setBusCache(updatedBuses);

          const { broadcast } = require('./sseService');

          // ── Always broadcast position immediately for smooth movement ──
          if (ws.pingsSent % ETA_EVERY === 0) {
            // Compute ETA async, don't block broadcast
            const { predictETA } = require('./etaService');
            predictETA({
              routeId:      ws.routeId,
              currentLat:   Number(lat),
              currentLng:   Number(lng),
              currentSpeed: speed,
            }).then((eta) => {
              broadcast(ws.routeId, 'position', { ...pingData, eta });
            }).catch(() => {
              broadcast(ws.routeId, 'position', { ...pingData, eta: null });
            });
          } else {
            // Immediate — no DB wait
            broadcast(ws.routeId, 'position', { ...pingData, eta: null });
          }

          // Always broadcast bus list update
          broadcast('__all__', 'buses_update', updatedBuses);

          ws.send(JSON.stringify({ type: 'ping_ack', timestamp: pingData.timestamp }));
          break;
        }

        case 'buffer_flush': {
          if (!ws.routeId || !msg.pings?.length) break;
          await flushBuffer(payload.id, ws.routeId, msg.pings);
          const last = msg.pings[msg.pings.length - 1];
          if (last) {
            const busData = {
              routeId: ws.routeId,
              driverName:    driverDoc?.name        || 'Driver',
              vehicleNumber: driverDoc?.vehicleNumber || 'BUS',
              lat: Number(last.lat), lng: Number(last.lng),
              speed: last.speed || 0, timestamp: last.timestamp,
            };
            await redisService.setActiveBus(payload.id, busData);
            global.invalidateBusCache();
            const buses = await global.getBuses();
            const { broadcast } = require('./sseService');
            broadcast(ws.routeId, 'position', { ...last, buffered: true });
            broadcast('__all__', 'buses_update', buses);
          }
          ws.send(JSON.stringify({ type: 'flush_ack', count: msg.pings.length }));
          break;
        }

        case 'trip_end': {
          if (!ws.tripId) break;

          const trip = await TripLog.findById(ws.tripId);

          // Save final pings to MongoDB on trip end
          await Promise.all([
            TripLog.findByIdAndUpdate(ws.tripId, {
              status: 'completed', endTime: new Date(),
            }),
            redisService.deleteVehicleState(ws.routeId),
            redisService.removeActiveBus(payload.id),
          ]);

          global.invalidateBusCache();
          const buses = await global.getBuses();

          const { broadcast } = require('./sseService');
          broadcast(ws.routeId, 'trip_status', { status: 'ended' });
          broadcast('__all__', 'buses_update', buses);

          ws.send(JSON.stringify({ type: 'trip_ended' }));

          if (trip?.pings?.length >= 2) {
            learnFromTrip(ws.routeId, trip.pings).catch(console.error);
          }

          ws.routeId   = null;
          ws.tripId    = null;
          ws.pingsSent = 0;
          break;
        }
      }
    });

    ws.on('close', async (code) => {
      console.log(`[WS] Disconnected: ${payload.email}`);
      if (ws.routeId) {
        const { broadcast } = require('./sseService');
        broadcast(ws.routeId, 'trip_status', { status: 'driver_disconnected' });
        await redisService.removeActiveBus(payload.id).catch(() => {});
        global.invalidateBusCache();
        const buses = await global.getBuses();
        broadcast('__all__', 'buses_update', buses);
      }
    });

    ws.on('error', (err) => console.error(`[WS] Error:`, err.message));
  });

  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (!ws.isAlive) { ws.terminate(); return; }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => clearInterval(interval));
}

module.exports = { initWSServer };