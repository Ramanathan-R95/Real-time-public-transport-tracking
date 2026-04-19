const redisService = require('./redisService');

const clients = new Map();

function initSSEService(app, redisClient) {
  redisService.init(redisClient);

  app.get('/sse/route/:routeId', (req, res) => {
    const { routeId } = req.params;

    res.set({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.flushHeaders();

    // Send current state immediately
    redisService.getVehicleState(routeId).then((state) => {
      if (state) sendEvent(res, 'position', state);
    });

    // Send current active buses immediately
    redisService.getAllActiveBuses().then((buses) => {
      sendEvent(res, 'buses_update', buses);
    });

    // Subscribe to route-specific + global channel
    if (!clients.has(routeId)) clients.set(routeId, new Set());
    clients.get(routeId).add(res);

    if (!clients.has('__all__')) clients.set('__all__', new Set());
    clients.get('__all__').add(res);

    const heartbeat = setInterval(() => sendEvent(res, 'ping', { t: Date.now() }), 20000);

    req.on('close', () => {
      clearInterval(heartbeat);
      clients.get(routeId)?.delete(res);
      clients.get('__all__')?.delete(res);
    });
  });
}

function broadcast(routeId, event, data) {
  const subs = clients.get(routeId);
  if (!subs) return;
  subs.forEach((res) => sendEvent(res, event, data));
}

function sendEvent(res, event, data) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

module.exports = { initSSEService, broadcast };