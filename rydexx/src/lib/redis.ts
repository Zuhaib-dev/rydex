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
    maxRetriesPerRequest: null,
    // Do not block app startup waiting for Redis — fail fast and let callers handle it
    enableReadyCheck: false,
    lazyConnect: false,
    connectTimeout: 5000,
    commandTimeout: 1500, // Fail any stuck command after 1.5 seconds so UI doesn't hang 10-15s
    retryStrategy(times) {
      // Retry up to 3 times with short backoff, then stop retrying
      if (times > 3) return null;
      return Math.min(times * 200, 1000);
    },
  });

  cached.client.on("error", (err) => {
    console.error("[Redis] Client error:", err.message);
  });

  cached.client.on("connect", () => {
    console.log("[Redis] Connected successfully.");
  });

  cached.client.on("ready", () => {
    console.log("[Redis] Client is ready.");
  });

  return cached.client;
};
