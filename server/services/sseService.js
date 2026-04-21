const redisService = require('./redisService');

// One map per client: clientId → res
// One map per channel: channelId → Set of clientIds
let clientId  = 0;
const clients     = new Map(); // id → res
const channels    = new Map(); // channelId → Set of ids

function initSSEService(app) {
  app.get('/sse/route/:routeId', (req, res) => {
    const { routeId } = req.params;

    res.set({
      'Content-Type':      'text/event-stream',
      'Cache-Control':     'no-cache',
      'Connection':        'keep-alive',
      'X-Accel-Buffering': 'no',
      'Access-Control-Allow-Origin': req.headers.origin || '*',
    });
    res.flushHeaders();

    const id = ++clientId;
    clients.set(id, res);

    // Subscribe to route-specific channel
    if (!channels.has(routeId))   channels.set(routeId,   new Set());
    if (!channels.has('__all__')) channels.set('__all__',  new Set());
    channels.get(routeId).add(id);
    channels.get('__all__').add(id);

    // Send current state immediately
    redisService.getVehicleState(routeId).then((state) => {
      if (state?.lat) sendToClient(id, 'position', state);
    }).catch(() => {});

    redisService.getAllActiveBuses().then((buses) => {
      sendToClient(id, 'buses_update', buses);
    }).catch(() => {});

    // Heartbeat
    const heartbeat = setInterval(() => {
      sendToClient(id, 'ping', { t: Date.now() });
    }, 20000);

    req.on('close', () => {
      clearInterval(heartbeat);
      clients.delete(id);
      channels.get(routeId)?.delete(id);
      channels.get('__all__')?.delete(id);
    });
  });
}

function sendToClient(id, event, data) {
  const res = clients.get(id);
  if (!res) return;
  try {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  } catch {
    clients.delete(id);
  }
}

function broadcast(channelId, event, data) {
  const ids = channels.get(channelId);
  if (!ids || ids.size === 0) return;
  ids.forEach((id) => sendToClient(id, event, data));
}

module.exports = { initSSEService, broadcast };