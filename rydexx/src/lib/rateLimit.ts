import { Redis } from "ioredis";

// Reuse existing Redis connection string or default to local
const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

/**
 * Basic fixed-window rate limiter using Redis.
 * @param identifier The unique key to rate limit (e.g., IP address or User ID)
 * @param limit Max number of requests allowed in the window
 * @param windowInSeconds The time window in seconds
 * @returns { success: boolean, remaining: number }
 */
export async function rateLimit(
  identifier: string,
  limit: number = 5,
  windowInSeconds: number = 60
): Promise<{ success: boolean; remaining: number }> {
  try {
    const key = `ratelimit:${identifier}`;
    
    // Increment the counter for this identifier
    const requests = await redis.incr(key);
    
    // If it's the first request, set the expiry window
    if (requests === 1) {
      await redis.expire(key, windowInSeconds);
    }
    
    const remaining = Math.max(0, limit - requests);
    
    return {
      success: requests <= limit,
      remaining,
    };
  } catch (error) {
    // If Redis fails, fail open (allow the request) rather than breaking the app
    console.warn("Rate limit Redis error:", error);
    return { success: true, remaining: limit };
  }
}
