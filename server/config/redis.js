const Redis = require('ioredis');

async function connectRedis() {
  const client = new Redis({
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT || 6379,
    retryStrategy: (times) => Math.min(times * 100, 3000),
  });

  client.on('connect', () => console.log('Redis connected'));
  client.on('error', (err) => console.error('Redis error:', err.message));

  return client;
}

module.exports = connectRedis;