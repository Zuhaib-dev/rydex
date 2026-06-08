import mongoose from "mongoose";
import User from "../../models/user.models.js";
import { redisPub } from "./redis.js";

export async function connectDatabase() {
  const mongoUrl = process.env.MONGODB_URL;
  if (!mongoUrl) {
    throw new Error("MONGODB_URL env is not set!");
  }
  
  await mongoose.connect(mongoUrl);
  console.log("MongoDB connected successfully.");

  // Clean up stale online connections on startup
  try {
    const resetResult = await User.updateMany(
      {},
      {
        isOnline: false,
        socketId: null,
        isPartnerAvailable: false,
      }
    );
    console.log("Database startup cleanup completed. Reset result:", resetResult);
  } catch (error) {
    console.error("Database startup cleanup failed:", error);
  }

  // Clean up active driver locations GeoSet in Redis on startup
  try {
    await redisPub.del("driver:locations:active");
    console.log("Redis active locations cleared on startup.");
  } catch (error: any) {
    console.error("Failed to clear Redis active locations on startup:", error.message);
  }

  // Enable Redis keyspace event notifications for key expiration (Ex)
  try {
    await redisPub.config("SET", "notify-keyspace-events", "Ex");
    console.log("Redis keyspace events notifications configured successfully.");
  } catch (error: any) {
    console.error("Failed to configure Redis keyspace events:", error.message);
  }
}
