require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const connectDB = require('./config/db');
const connectRedis = require('./config/redis');
const { initWSServer } = require('./services/wsService');
const { initSSEService } = require('./services/sseService');

const authRoutes   = require('./routes/authRoutes');
const driverRoutes = require('./routes/driverRoutes');
const routeRoutes  = require('./routes/routeRoutes');
const etaRoutes    = require('./routes/etaRoutes');
const adminRoutes  = require('./routes/adminRoutes');

const app    = express();
const server = http.createServer(app);

app.use(cors({ origin: process.env.CLIENT_ORIGIN, credentials: true }));
app.use(express.json());

app.use('/api/auth',    authRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/routes',  routeRoutes);
app.use('/api/eta',     etaRoutes);
app.use('/api/admin',   adminRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

async function start() {
  await connectDB();
  const redisClient = await connectRedis();
  initWSServer(server, redisClient);
  initSSEService(app, redisClient);
  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

start();