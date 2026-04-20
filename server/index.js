require('dotenv').config();
const express  = require('express');
const http     = require('http');
const cors     = require('cors');

const connectDB          = require('./config/db');
const { connectRedis }   = require('./config/redis');
const { initWSServer }   = require('./services/wsService');
const { initSSEService } = require('./services/sseService');

// Register all Mongoose models
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

// CORS — allow Vercel frontend + local dev
const allowedOrigins = [
  process.env.CLIENT_ORIGIN,
  'http://localhost:5173',
  'http://localhost:3000',
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  next();
});

// Routes
app.use('/api/auth',    authRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/routes',  routeRoutes);
app.use('/api/eta',     etaRoutes);
app.use('/api/admin',   adminRoutes);

// Health check — Render pings this to keep the service alive
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    time:   new Date().toISOString(),
    env:    process.env.NODE_ENV || 'development',
  });
});

// 404
app.use((req, res) => {
  res.status(404).json({ message: `Cannot ${req.method} ${req.path}` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Error]', err.message);
  res.status(500).json({ message: 'Internal server error' });
});

async function start() {
  await connectDB();
  await connectRedis();
  const redisService = require('./services/redisService');
  await redisService.clearActiveBuses();

  initWSServer(server);
  initSSEService(app);

  const PORT = parseInt(process.env.PORT) || 5000;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`\nCampusTrack running on port ${PORT}`);
    console.log(`  Health: http://localhost:${PORT}/health\n`);
  });
}

start().catch((err) => {
  console.error('Startup failed:', err);
  process.exit(1);
});