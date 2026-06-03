import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { io as Client } from "socket.io-client";
import RedisMock from "ioredis-mock";

// Mock ioredis with in-memory Redis client
vi.mock("ioredis", () => {
  return {
    default: RedisMock,
  };
});

// Mock axios so that background API calls to Next.js (like cascade) don't trigger real HTTP requests
vi.mock("axios", () => {
  return {
    default: {
      post: vi.fn().mockResolvedValue({ data: { success: true } }),
      get: vi.fn().mockResolvedValue({ data: {} }),
    },
  };
});

let mongoServer;
let server;
let io;
let User;
let clientSocket;
let testPort;

beforeAll(async () => {
  // 1. Setup in-memory MongoDB
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  process.env.MONGODB_URL = uri;
  process.env.NODE_ENV = "test";
  
  // 2. Dynamically import server and models after environment setup
  const indexMod = await import("../index.js");
  server = indexMod.server;
  io = indexMod.io;
  
  const userMod = await import("../models/user.models.js");
  User = userMod.default;

  // 3. Listen on a random free port
  await new Promise((resolve) => {
    server.listen(0, () => {
      testPort = server.address().port;
      resolve();
    });
  });
});

afterAll(async () => {
  // Clean up
  if (io) io.close();
  if (server) server.close();
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

beforeEach(async () => {
  vi.clearAllMocks();
  if (mongoose.connection.readyState === 1) {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  }
});

describe("WebSocket Realtime Integration Tests", () => {
  it("should update driver socketId and status on identity event", () => {
    return new Promise(async (resolve, reject) => {
      try {
        // Create user in in-memory DB
        const testUser = await User.create({
          name: "Test Driver",
          email: "driver@rydex.com",
          role: "partner",
          isOnline: false,
          partnerStatus: "approved",
        });

        // Connect socket client
        clientSocket = Client(`http://localhost:${testPort}`);

        clientSocket.on("connect", () => {
          // Emit identity event to link socket to user
          clientSocket.emit("identity", testUser._id.toString());

          // Verify status was updated in database
          setTimeout(async () => {
            try {
              const dbUser = await User.findById(testUser._id);
              expect(dbUser.isOnline).toBe(true);
              expect(dbUser.socketId).toBe(clientSocket.id);
              expect(dbUser.isPartnerAvailable).toBe(true);

              clientSocket.on("disconnect", () => {
                setTimeout(resolve, 100);
              });
              clientSocket.disconnect();
            } catch (err) {
              clientSocket.disconnect();
              reject(err);
            }
          }, 300);
        });

        clientSocket.on("connect_error", (err) => {
          reject(err);
        });
      } catch (err) {
        reject(err);
      }
    });
  });
});
