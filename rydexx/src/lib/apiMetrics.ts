import { getRedisClient } from "./redis";

export async function recordApiMetrics(
  durationMs: number,
  status: number,
  path: string
) {
  try {
    const redis = getRedisClient();
    const metricStr = `${durationMs}:${status}:${path}`;
    const pipeline = redis.multi();
    pipeline.lpush("api:metrics:raw", metricStr);
    pipeline.ltrim("api:metrics:raw", 0, 1999); // Limit raw queue buffer to 2000 items
    await pipeline.exec();
  } catch (error) {
    console.error("[ApiMetrics] Failed to record API metric in Redis:", error);
  }
}

export function withMetrics(handler: (req: any, ...args: any[]) => Promise<any>) {
  return async function (req: any, ...args: any[]) {
    const start = Date.now();
    let status = 200;
    try {
      const response = await handler(req, ...args);
      // Next.js Route handlers return standard Response/NextResponse objects
      status = response?.status || 200;
      return response;
    } catch (error) {
      status = 500;
      throw error;
    } finally {
      const duration = Date.now() - start;
      try {
        const url = new URL(req.url);
        const path = url.pathname;
        void recordApiMetrics(duration, status, path);
      } catch (urlError) {
        console.error("[ApiMetrics] Failed to parse URL in metrics tracker:", urlError);
      }
    }
  };
}
