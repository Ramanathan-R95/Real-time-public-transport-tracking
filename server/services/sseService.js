const redisService = require('./redisService');

const clients = new Map();

function initSSEService(app) {
  // No redis init here — redisService uses getClient() internally

  app.get('/sse/route/:routeId', (req, res) => {
    const { routeId } = req.params;

    res.set({
      'Content-Type':    'text/event-stream',
      'Cache-Control':   'no-cache',
      'Connection':      'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.flushHeaders();

    // Send current vehicle state immediately on connect
    redisService.getVehicleState(routeId).then((state) => {
      if (state?.lat) sendEvent(res, 'position', state);
    }).catch(() => {});

    // Send active buses immediately
    redisService.getAllActiveBuses().then((buses) => {
      sendEvent(res, 'buses_update', buses);
    }).catch(() => {});

    if (!clients.has(routeId))    clients.set(routeId,    new Set());
    if (!clients.has('__all__'))  clients.set('__all__',  new Set());

    clients.get(routeId).add(res);
    clients.get('__all__').add(res);

    // Heartbeat every 25s
    const heartbeat = setInterval(() => {
      try { sendEvent(res, 'ping', { t: Date.now() }); }
      catch { clearInterval(heartbeat); }
    }, 25000);

    req.on('close', () => {
      clearInterval(heartbeat);
      clients.get(routeId)?.delete(res);
      clients.get('__all__')?.delete(res);
    });
  });
}

function broadcast(routeId, event, data) {
  const subs = clients.get(routeId);
  if (!subs || subs.size === 0) return;
  subs.forEach((res) => {
    try { sendEvent(res, event, data); }
    catch { subs.delete(res); }
  });
}

function sendEvent(res, event, data) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

module.exports = { initSSEService, broadcast };