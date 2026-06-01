import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";

let cached = global.redisClient;

if (!cached) {
  cached = global.redisClient = { client: null };
}

export const getRedisClient = (): Redis => {
  if (cached.client) {
    return cached.client;
  }

  cached.client = new Redis(redisUrl, {
    maxRetriesPerRequest: null, // Critical for Redis queues/streams
  });

  cached.client.on("error", (err) => {
    console.error("Redis Client Error:", err.message);
  });

  return cached.client;
};
