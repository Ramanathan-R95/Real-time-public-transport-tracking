const WebSocket  = require('ws');
const jwt        = require('jsonwebtoken');
const redisService = require('./redisService');
const { broadcast } = require('./sseService');
const { flushBuffer, inferSpeed } = require('./bufferService');
const { predictETA, learnFromTrip } = require('./etaService');
const TripLog = require('../models/TripLog');
const Driver  = require('../models/Driver');

function initWSServer(server) {
  const wss = new WebSocket.Server({ server, path: '/ws' });
  console.log('[WS] Server initialised at /ws');

  wss.on('connection', async (ws, req) => {
    const url   = new URL(req.url, 'http://localhost');
    const token = url.searchParams.get('token');

    let payload = null;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      console.error('[WS] Auth failed:', err.message);
      ws.close(4001, 'Unauthorized');
      return;
    }

    const driverDoc = await Driver.findById(payload.id)
      .select('name vehicleNumber assignedRoute');

    console.log(`[WS] Driver connected: ${payload.email} (${driverDoc?.name})`);

    ws.driverId  = payload.id;
    ws.routeId   = null;
    ws.tripId    = null;
    ws.lastPing  = null;
    ws.isAlive   = true;

    ws.send(JSON.stringify({ type: 'auth_ok', driverId: payload.id }));

    ws.on('pong', () => { ws.isAlive = true; });

    ws.on('message', async (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        console.error('[WS] Invalid JSON from driver');
        return;
      }

      console.log(`[WS] Message from ${payload.email}:`, msg.type, msg.routeId || '');

      switch (msg.type) {

        case 'trip_start': {
          ws.routeId = msg.routeId;

          const trip = await TripLog.create({
            driver:    payload.id,
            route:     msg.routeId,
            status:    'active',
            startTime: new Date(),
          });
          ws.tripId = trip._id.toString();

          const busData = {
            routeId:       msg.routeId,
            driverName:    driverDoc?.name    || 'Driver',
            vehicleNumber: driverDoc?.vehicleNumber || 'BUS',
            lat:           null,
            lng:           null,
            speed:         0,
            timestamp:     new Date().toISOString(),
          };

          await redisService.setActiveBus(payload.id, busData);
          await redisService.setVehicleState(msg.routeId, {
            ...busData, driverId: payload.id,
          });

          console.log(`[WS] Trip started: tripId=${ws.tripId} routeId=${msg.routeId}`);
          console.log('[WS] Bus data saved to Redis:', busData);

          // Verify it was saved
          const saved = await redisService.getAllActiveBuses();
          console.log('[WS] Active buses after trip_start:', saved);

          ws.send(JSON.stringify({ type: 'trip_started', tripId: ws.tripId }));
          broadcast(msg.routeId, 'trip_status', { status: 'started', driverId: payload.id });
          broadcast('__all__', 'buses_update', saved);
          break;
        }

        case 'ping': {
          if (!ws.routeId) {
            console.warn('[WS] Ping received but no routeId set');
            break;
          }

          const { lat, lng, accuracy, timestamp } = msg;

          if (lat === undefined || lng === undefined) {
            console.warn('[WS] Ping missing lat/lng');
            break;
          }

          const speed    = inferSpeed(ws.lastPing, { lat, lng, timestamp });
          const pingData = {
            lat:       Number(lat),
            lng:       Number(lng),
            accuracy:  accuracy || 0,
            timestamp: timestamp || new Date().toISOString(),
            speed,
          };
          ws.lastPing = pingData;

          console.log(`[WS] Ping from ${payload.email}: lat=${lat} lng=${lng} speed=${speed.toFixed(1)}`);

          const busData = {
            routeId:       ws.routeId,
            driverName:    driverDoc?.name    || 'Driver',
            vehicleNumber: driverDoc?.vehicleNumber || 'BUS',
            lat:           Number(lat),
            lng:           Number(lng),
            speed,
            timestamp:     pingData.timestamp,
          };

          // Save everything concurrently
          await Promise.all([
            redisService.setVehicleState(ws.routeId, {
              ...busData, driverId: payload.id,
            }),
            redisService.pushPingHistory(ws.routeId, pingData),
            redisService.setActiveBus(payload.id, busData),
            TripLog.findByIdAndUpdate(ws.tripId, {
              $push: { pings: pingData },
            }),
          ]);

          const allBuses = await redisService.getAllActiveBuses();
          console.log('[WS] Active buses after ping:', allBuses);

          // Broadcast position to all SSE subscribers
          broadcast(ws.routeId, 'position', {
            lat: Number(lat),
            lng: Number(lng),
            accuracy, speed,
            timestamp: pingData.timestamp,
            eta: null,
          });

          // Broadcast updated bus list
          broadcast('__all__', 'buses_update', allBuses);

          // Compute ETA async
          predictETA({
            routeId:      ws.routeId,
            currentLat:   Number(lat),
            currentLng:   Number(lng),
            currentSpeed: speed,
          }).then((eta) => {
            if (eta) broadcast(ws.routeId, 'position', {
              lat: Number(lat), lng: Number(lng),
              accuracy, speed,
              timestamp: pingData.timestamp,
              eta,
            });
          }).catch(() => {});

          ws.send(JSON.stringify({ type: 'ping_ack', timestamp: pingData.timestamp }));
          break;
        }

        case 'buffer_flush': {
          if (!ws.routeId || !msg.pings?.length) break;
          console.log(`[WS] Buffer flush: ${msg.pings.length} pings`);
          await flushBuffer(payload.id, ws.routeId, msg.pings);
          const last = msg.pings[msg.pings.length - 1];
          if (last) {
            broadcast(ws.routeId, 'position', { ...last, buffered: true });
            const busData = {
              routeId:       ws.routeId,
              driverName:    driverDoc?.name    || 'Driver',
              vehicleNumber: driverDoc?.vehicleNumber || 'BUS',
              lat:           Number(last.lat),
              lng:           Number(last.lng),
              speed:         last.speed || 0,
              timestamp:     last.timestamp,
            };
            await redisService.setActiveBus(payload.id, busData);
            const buses = await redisService.getAllActiveBuses();
            broadcast('__all__', 'buses_update', buses);
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
            redisService.removeActiveBus(payload.id),
          ]);

          broadcast(ws.routeId, 'trip_status', { status: 'ended' });
          const buses = await redisService.getAllActiveBuses();
          broadcast('__all__', 'buses_update', buses);

          ws.send(JSON.stringify({ type: 'trip_ended' }));
          console.log(`[WS] Trip ended: ${ws.tripId}`);

          if (trip?.pings?.length >= 2) {
            learnFromTrip(ws.routeId, trip.pings).catch(console.error);
          }

          ws.routeId = null;
          ws.tripId  = null;
          break;
        }

        default:
          console.warn('[WS] Unknown message type:', msg.type);
      }
    });

    ws.on('close', async (code) => {
      console.log(`[WS] Driver disconnected: ${payload.email}, code: ${code}`);
      if (ws.routeId) {
        broadcast(ws.routeId, 'trip_status', { status: 'driver_disconnected' });
        await redisService.removeActiveBus(payload.id).catch(() => {});
        const buses = await redisService.getAllActiveBuses();
        broadcast('__all__', 'buses_update', buses);
      }
    });

    ws.on('error', (err) => {
      console.error(`[WS] Error (${payload.email}):`, err.message);
    });
  });

  // Heartbeat to detect dead connections
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