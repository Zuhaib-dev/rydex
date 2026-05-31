import { getRedisClient } from "./redis";

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
    const pipeline = redis.multi();
    
    // Remove entries older than the sliding window boundary
    pipeline.zremrangebyscore(redisKey, 0, clearBefore);
    // Count remaining request entries in the current window
    pipeline.zcard(redisKey);
    // Add the current request entry (using timestamp as score, and unique member string)
    pipeline.zadd(redisKey, now, `${now}-${Math.random()}`);
    // Set TTL on log to automatically clean up inactive keys
    pipeline.expire(redisKey, windowSeconds + 1);

    const execResults = await pipeline.exec();
    if (!execResults) {
      return false; // Safely allow request on transaction failure
    }

    // Index 1 contains result of ZCARD command
    const currentRequestCount = execResults[1][1] as number;
    
    return currentRequestCount >= limit;
  } catch (error) {
    console.error(`Rate Limiter error for key ${key}:`, error);
    return false; // Fail open in production to prevent blocking users if Redis is down
  }
}
