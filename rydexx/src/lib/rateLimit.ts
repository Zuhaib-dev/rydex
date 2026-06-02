import { getRedisClient } from "./redis";
import { randomUUID } from "crypto";

/**
 * Checks if a key has exceeded a specific rate limit within a sliding time window.
 * Uses a Redis Sorted Set (zset) transaction to implement a sliding window algorithm.
 * 
 * @param key Unique key to identify the actor and endpoint (e.g. "quote:user_123")
 * @param limit Maximum number of allowed requests in the window
 * @param windowSeconds Time window duration in seconds
 * @returns Promise<boolean> true if rate limited (exceeded), false if request is allowed
 */
export async function isRateLimited(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<boolean> {
  const redis = getRedisClient();
  const now = Date.now();
  const clearBefore = now - windowSeconds * 1000;
  const redisKey = `rate:limit:api:${key}`;

  try {
    const requestId = randomUUID();

    const result = await redis.eval(
      `
      redis.call("ZREMRANGEBYSCORE", KEYS[1], 0, ARGV[1])
      local count = redis.call("ZCARD", KEYS[1])
      if count >= tonumber(ARGV[3]) then
        redis.call("EXPIRE", KEYS[1], ARGV[4])
        return 1
      end
      redis.call("ZADD", KEYS[1], ARGV[2], ARGV[5])
      redis.call("EXPIRE", KEYS[1], ARGV[4])
      return 0
      `,
      1,
      redisKey,
      clearBefore,
      now,
      limit,
      windowSeconds + 1,
      requestId,
    );

    return result === 1;
  } catch (error) {
    console.error(`Rate Limiter error for key ${key}:`, error);
    return false; // Fail open in production to prevent blocking users if Redis is down
  }
}
