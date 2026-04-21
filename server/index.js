require('dotenv').config();
const express  = require('express');
const http     = require('http');
const cors     = require('cors');

const connectDB        = require('./config/db');
const { connectRedis } = require('./config/redis');
const { initWSServer } = require('./services/wsService');
const redisService     = require('./services/redisService');

require('./models/Driver');
require('./models/Route');
require('./models/TripLog');
require('./models/Admin');
require('./models/SegmentStats');

const authRoutes   = require('./routes/authRoutes');
const driverRoutes = require('./routes/driverRoutes');
const routeRoutes  = require('./routes/routeRoutes');
const etaRoutes    = require('./routes/etaRoutes');
const adminRoutes  = require('./routes/adminRoutes');

const app    = express();
const server = http.createServer(app);

const allowedOrigins = [
  process.env.CLIENT_ORIGIN,
  'http://localhost:5173',
  'http://localhost:3000',
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowedOrigins.some(o => origin.startsWith(o.replace(/\/$/, '')))) return cb(null, true);
    console.warn('[CORS] Blocked:', origin);
    return cb(null, true); // allow all during debug — tighten after
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}));
app.options('*', cors());
app.use(express.json({ limit: '10mb' }));

// ── SSE endpoint — registered DIRECTLY here, not in a service ──
app.get('/sse/route/:routeId', (req, res) => {
  const { routeId } = req.params;
  console.log(`[SSE] Client connected for route: ${routeId}`);

  res.set({
    'Content-Type':      'text/event-stream',
    'Cache-Control':     'no-cache',
    'Connection':        'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();

  // Send current bus state immediately
  redisService.getAllActiveBuses().then((buses) => {
    console.log(`[SSE] Sending initial buses to client:`, buses);
    write(res, 'buses_update', buses);
  }).catch(console.error);

  redisService.getVehicleState(routeId).then((state) => {
    if (state?.lat) {
      console.log(`[SSE] Sending initial position:`, state);
      write(res, 'position', state);
    }
  }).catch(console.error);

  // Register client
  addClient(routeId, res);

  // Heartbeat every 20s
  const hb = setInterval(() => {
    try { write(res, 'ping', { t: Date.now() }); }
    catch { clearInterval(hb); }
  }, 20000);

  req.on('close', () => {
    console.log(`[SSE] Client disconnected for route: ${routeId}`);
    clearInterval(hb);
    removeClient(routeId, res);
  });
});

// ── SSE client registry ──
const sseClients = new Map(); // routeId → Set<res>

function addClient(routeId, res) {
  if (!sseClients.has(routeId))     sseClients.set(routeId,    new Set());
  if (!sseClients.has('__all__'))   sseClients.set('__all__',  new Set());
  sseClients.get(routeId).add(res);
  sseClients.get('__all__').add(res);
}

function removeClient(routeId, res) {
  sseClients.get(routeId)?.delete(res);
  sseClients.get('__all__')?.delete(res);
}

function write(res, event, data) {
  try {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  } catch (e) {
    console.error('[SSE] Write error:', e.message);
  }
}

// Export broadcast so wsService can use it
function broadcast(channelId, event, data) {
  const subs = sseClients.get(channelId);
  if (!subs || subs.size === 0) return;
  console.log(`[SSE] Broadcasting '${event}' to ${subs.size} clients on channel '${channelId}'`);
  subs.forEach((res) => write(res, event, data));
}

// Make broadcast available globally
global.sseBroadcast = broadcast;

// ── REST routes ──
app.use('/api/auth',    authRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/routes',  routeRoutes);
app.use('/api/eta',     etaRoutes);
app.use('/api/admin',   adminRoutes);

// ── Health + debug ──
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.get('/debug/state', async (req, res) => {
  try {
    const TripLog = require('./models/TripLog');
    const Driver  = require('./models/Driver');
    const buses   = await redisService.getAllActiveBuses();
    const trips   = await TripLog.find({ status: 'active' }).populate('driver route');
    const drivers = await Driver.find().select('name email vehicleNumber');
    res.json({
      activeBuses_in_redis:  buses,
      active_trips_in_mongo: trips.map(t => ({
        id: t._id, driver: t.driver?.name,
        route: t.route?.routeNumber, pingCount: t.pings?.length,
      })),
      all_drivers: drivers,
      sse_channels: [...sseClients.entries()].map(([k,v]) => ({ channel: k, clients: v.size })),
    });
  } catch (err) {
    res.json({ error: err.message });
  }
});

// ── 404 handler ──
app.use((req, res) => {
  console.log('[404]', req.method, req.path);
  res.status(404).json({ message: `Cannot ${req.method} ${req.path}` });
});

app.use((err, req, res, next) => {
  console.error('[Error]', err.message);
  res.status(500).json({ message: 'Internal server error' });
});

async function start() {
  await connectDB();
  await connectRedis();
  await redisService.clearActiveBuses();

  // WS server uses global broadcast
  initWSServer(server);

  const PORT = parseInt(process.env.PORT) || 5000;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`\nCampusTrack running on port ${PORT}`);
    console.log(`  SSE test: http://localhost:${PORT}/sse/route/test\n`);
  });

  // Keep Render awake
  if (process.env.NODE_ENV === 'production' && process.env.RENDER_EXTERNAL_HOSTNAME) {
    setInterval(async () => {
      try {
        const axios = require('axios');
        await axios.get(`https://${process.env.RENDER_EXTERNAL_HOSTNAME}/health`);
      } catch {}
    }, 14 * 60 * 1000);
  }
}

start().catch(err => { console.error('Startup failed:', err); process.exit(1); });