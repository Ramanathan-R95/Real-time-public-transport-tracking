let client = null;

async function connectRedis() {
  const upstashUrl   = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (upstashUrl && upstashToken) {
    // Production — Upstash REST
    console.log('Using Upstash Redis...');
    const { Redis } = require('@upstash/redis');
    client = new Redis({ url: upstashUrl, token: upstashToken });
    try {
      await client.ping();
      console.log('Upstash Redis connected');
    } catch (err) {
      console.error('Upstash Redis failed:', err.message);
      throw err;
    }
  } else {
    // Local development — ioredis
    console.log('Using local Redis (ioredis)...');
    const IORedis = require('ioredis');
    client = new IORedis({
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      retryStrategy: (times) => Math.min(times * 100, 3000),
      maxRetriesPerRequest: null,
    });
    client.on('connect', () => console.log('Local Redis connected'));
    client.on('error',   (err) => console.error('Redis error:', err.message));

    // Wrap ioredis to match Upstash API shape
    const original = client;
    client = {
      ping:   ()            => original.ping(),
      get:    (key)         => original.get(key),
      set:    (key, val, opts) => {
        if (opts?.ex) return original.set(key, val, 'EX', opts.ex);
        return original.set(key, val);
      },
      del:    (key)         => original.del(key),
      lpush:  (key, ...vals)=> original.lpush(key, ...vals),
      ltrim:  (key, s, e)   => original.ltrim(key, s, e),
      lrange: (key, s, e)   => original.lrange(key, s, e),
      expire: (key, sec)    => original.expire(key, sec),
      // hset for ioredis: hset(key, field, value)
      hset: (key, obj) => {
        const args = [];
        for (const [f, v] of Object.entries(obj)) args.push(f, v);
        return original.hset(key, ...args);
      },
      hdel:    (key, field) => original.hdel(key, field),
      hgetall: (key)        => original.hgetall(key),
    };
  }

  return client;
}

function getClient() {
  if (!client) throw new Error('Redis not initialised');
  return client;
}

module.exports = { connectRedis, getClient };