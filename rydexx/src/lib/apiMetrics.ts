import { getRedisClient } from "./redis";
import { NextRequest, NextResponse } from "next/server";

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

export function withMetrics(handler: (req: NextRequest, ...args: any[]) => Promise<NextResponse>) {
  return async function (req: NextRequest, ...args: any[]) {
    const start = Date.now();
    let status = 200;
    try {
      const response = await handler(req, ...args);
      status = response.status;
      return response;
    } catch (error) {
      status = 500;
      throw error;
    } finally {
      const duration = Date.now() - start;
      const url = new URL(req.url);
      const path = url.pathname;
      void recordApiMetrics(duration, status, path);
    }
  };
}
