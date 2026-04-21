let client = null;

async function connectRedis() {
  const upstashUrl   = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (upstashUrl && upstashToken) {
    console.log('[Redis] Using Upstash...');
    const { Redis } = require('@upstash/redis');
    client = new Redis({ url: upstashUrl, token: upstashToken });

    await client.ping();
    console.log('[Redis] Upstash connected');

    // Test hset works
    try {
      await client.hset('__test__', { testkey: 'testval' });
      const v = await client.hget('__test__', 'testkey');
      console.log('[Redis] hset test result:', v);
      await client.del('__test__');
    } catch (err) {
      console.error('[Redis] hset test FAILED:', err.message);
      console.log('[Redis] Trying alternative hset...');
      // Wrap with compatible hset
      const original = client;
      const originalHset = client.hset.bind(client);
      client.hset = async (key, ...args) => {
        // If called with (key, object), convert to flat args
        if (args.length === 1 && typeof args[0] === 'object') {
          const entries = Object.entries(args[0]).flat();
          return original.hset(key, ...entries);
        }
        return originalHset(key, ...args);
      };
    }

  } else {
    console.log('[Redis] Using local ioredis...');
    const IORedis = require('ioredis');
    const raw = new IORedis({
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      retryStrategy: (times) => Math.min(times * 100, 3000),
    });
    raw.on('connect', () => console.log('[Redis] Local connected'));
    raw.on('error',   (e) => console.error('[Redis] Error:', e.message));

    // Wrap ioredis to match Upstash API
    client = {
      ping:    ()           => raw.ping(),
      get:     (k)          => raw.get(k),
      set:     (k, v, o)    => o?.ex ? raw.set(k, v, 'EX', o.ex) : raw.set(k, v),
      del:     (k)          => raw.del(k),
      lpush:   (k, ...v)    => raw.lpush(k, ...v),
      ltrim:   (k, s, e)    => raw.ltrim(k, s, e),
      lrange:  (k, s, e)    => raw.lrange(k, s, e),
      expire:  (k, s)       => raw.expire(k, s),
      hset:    (k, obj)     => {
        const args = Object.entries(
          typeof obj === 'object' ? obj : {}
        ).flat();
        return raw.hset(k, ...args);
      },
      hdel:    (k, f)       => raw.hdel(k, f),
      hget:    (k, f)       => raw.hget(k, f),
      hgetall: (k)          => raw.hgetall(k),
    };
  }

  return client;
}

function getClient() {
  if (!client) throw new Error('Redis not initialised');
  return client;
}

module.exports = { connectRedis, getClient };