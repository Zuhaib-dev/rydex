import mongoose from "mongoose";
import Redis from "ioredis";

declare global {
  var mongooseConn: {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
  };
  var redisClient: {
    client: Redis | null;
  };
}

export {};