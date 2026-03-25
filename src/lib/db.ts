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
    cached.promise = mongoose.connect(mongodbUrl);
  }

  cached.conn = await cached.promise;
  return cached.conn;
};

export default connectDb;
