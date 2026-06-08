import { Redis } from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";

export const redisPub = new Redis(redisUrl);
export const redisSub = new Redis(redisUrl);

// Dedicated Redis clients for Socket.IO horizontal scaling
export const socketPub = redisPub.duplicate();
export const socketSub = redisSub.duplicate();

// Prevent unhandled rejection crashes during transient connection dropouts
redisPub.on("error", (err: Error) => console.error("Redis Pub Client Error:", err.message));
redisSub.on("error", (err: Error) => console.error("Redis Sub Client Error:", err.message));
socketPub.on("error", (err: Error) => console.error("Redis SocketPub Client Error:", err.message));
socketSub.on("error", (err: Error) => console.error("Redis SocketSub Client Error:", err.message));
