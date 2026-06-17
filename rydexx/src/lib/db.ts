import mongoose from "mongoose";

const mongodbUrl = process.env.MONGODB_URL!;

let cached = global.mongooseConn;

if (!cached) {
  cached = global.mongooseConn = { conn: null, promise: null };
}

const connectDb = async () => {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(mongodbUrl, {
      bufferCommands: false,        // Don't buffer ops before connection — fail fast
      serverSelectionTimeoutMS: 5000, // Give up selecting a server after 5s
      socketTimeoutMS: 30000,       // Kill idle socket after 30s
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
};

export default connectDb;
