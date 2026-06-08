import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { io as Client, Socket as ClientSocket } from "socket.io-client";
import RedisMock from "ioredis-mock";

vi.mock("ioredis", () => {
  return {
    Redis: class MockRedis extends RedisMock {
      constructor(options?: any) {
        super(options);
        (this as any).config = vi.fn().mockResolvedValue("OK");
        (this as any).geoadd = vi.fn().mockResolvedValue(1);
        (this as any).zrem = vi.fn().mockResolvedValue(1);
      }
    }
  };
});

// Mock axios so that background API calls to Next.js (like cascade) are mocked, while local HTTP calls go through
vi.mock("axios", async (importOriginal) => {
  const actualAxios: any = await importOriginal();
  return {
    default: {
      ...actualAxios,
      post: vi.fn().mockImplementation((url: string, data: any, config: any) => {
        if (url.includes("/api/booking/") && url.includes("/cascade")) {
          return Promise.resolve({ data: { success: true } });
        }
        return actualAxios.post(url, data, config);
      }),
      get: vi.fn().mockImplementation((url: string, config: any) => {
        return actualAxios.get(url, config);
      }),
    },
  };
});

import axios from "axios";

let mongoServer: MongoMemoryServer;
let server: any;
let io: any;
let User: any;
let clientSocket: any;
let testPort: number;

const socketUrl = () => `http://127.0.0.1:${testPort}`;

beforeAll(async () => {
  // 1. Setup in-memory MongoDB
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  process.env.MONGODB_URL = uri;
  process.env.NODE_ENV = "test";
  process.env.SOCKET_INTERNAL_SECRET = "test-socket-secret-key-123456";
  process.env.REDIS_URL = "redis://127.0.0.1:6379";
  await mongoose.connect(uri);
  
  // 2. Dynamically import server and models after environment setup
  const indexMod = await import("../index.js");
  server = indexMod.server;
  io = indexMod.io;
  
  const userMod = await import("../models/user.models.js");
  User = userMod.default;

  // 3. Listen on a random free port
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      testPort = typeof address === "string" ? 8000 : address.port;
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
    return new Promise<void>(async (resolve, reject) => {
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
        clientSocket = Client(socketUrl());

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

        clientSocket.on("connect_error", (err: any) => {
          reject(err);
        });
      } catch (err) {
        reject(err);
      }
    });
  });

  it("should relay chat messages within the booking room", () => {
    return new Promise<void>(async (resolve, reject) => {
      let clientSocket1: ClientSocket, clientSocket2: ClientSocket;
      try {
        const bookingId = new mongoose.Types.ObjectId().toString();

        clientSocket1 = Client(socketUrl());
        clientSocket1.on("connect", () => {
          clientSocket2 = Client(socketUrl());
          clientSocket2.on("connect", () => {
            clientSocket1.emit("join-booking", bookingId);
            clientSocket2.emit("join-booking", bookingId);

            setTimeout(() => {
              clientSocket2.on("chat-message", (msg: any) => {
                try {
                  expect(msg.text).toBe("Hello Driver!");
                  expect(msg.sender).toBe("user");
                  
                  let disconnectedCount = 0;
                  const onDisconnect = () => {
                    disconnectedCount++;
                    if (disconnectedCount === 2) {
                      setTimeout(resolve, 100);
                    }
                  };
                  clientSocket1.on("disconnect", onDisconnect);
                  clientSocket2.on("disconnect", onDisconnect);

                  clientSocket1.disconnect();
                  clientSocket2.disconnect();
                } catch (err) {
                  clientSocket1.disconnect();
                  clientSocket2.disconnect();
                  reject(err);
                }
              });

              clientSocket1.emit("chat-message", {
                rideId: bookingId,
                text: "Hello Driver!",
                sender: "user",
              });
            }, 100);
          });
        });
      } catch (err) {
        reject(err);
      }
    });
  });

  it("should trigger cascade timer if driver ignores booking", async () => {
    vi.useFakeTimers();
    try {
      const bookingId = new mongoose.Types.ObjectId().toString();
      const driverId = new mongoose.Types.ObjectId().toString();

      await User.create({
        _id: driverId,
        name: "Test Driver",
        email: "driver@example.com",
        role: "partner",
      });

      const response = await axios.post(`${socketUrl()}/emit`, {
        userId: driverId,
        event: "new-booking",
        data: {
          _id: bookingId,
          driver: driverId,
        },
      }, {
        headers: { "x-socket-secret": process.env.SOCKET_INTERNAL_SECRET || "" }
      });

      expect(response.data.success).toBe(true);

      // Fast-forward 40 seconds
      vi.advanceTimersByTime(40000);

      // Yield to let the async callback execute the fetch call
      await new Promise(resolve => process.nextTick(resolve));
      await new Promise(resolve => process.nextTick(resolve));

      const mockPost = axios.post;
      const calls = vi.mocked(mockPost).mock.calls as any[][];
      
      const cascadeCall = calls.find(call => 
        call[0].includes(`/api/booking/${bookingId}/cascade`)
      );
      
      expect(cascadeCall).toBeDefined();
      expect(cascadeCall![1].driverId).toBe(driverId);

    } finally {
      vi.useRealTimers();
    }
  });

  it("should throttle location updates exceeding the rate limit", () => {
    return new Promise<void>(async (resolve, reject) => {
      let tempClientSocket: any;
      try {
        const testDriver = await User.create({
          name: "Throttled Driver",
          email: "throttled@rydex.com",
          role: "partner",
          isOnline: false,
          partnerStatus: "approved",
        });

        const spy = vi.spyOn(User, "findByIdAndUpdate");

        tempClientSocket = Client(socketUrl());
        tempClientSocket.on("connect", () => {
          tempClientSocket.emit("identity", testDriver._id.toString());

          setTimeout(() => {
            // Send 12 rapid updates
            for (let i = 0; i < 12; i++) {
              tempClientSocket.emit("update-location", { latitude: 10 + i, longitude: 20 + i });
            }

            // Wait for socket server to process all events
            setTimeout(() => {
              try {
                // Should only update 10 times, the last 2 should be throttled
                expect(spy).toHaveBeenCalledTimes(10);
                
                tempClientSocket.on("disconnect", () => {
                  setTimeout(() => {
                    spy.mockRestore();
                    resolve();
                  }, 100);
                });
                tempClientSocket.disconnect();
              } catch (err) {
                tempClientSocket.disconnect();
                spy.mockRestore();
                reject(err);
              }
            }, 400);
          }, 100);
        });
      } catch (err) {
        reject(err);
      }
    });
  });

  it("should disconnect client immediately if blocked User connects", () => {
    return new Promise<void>(async (resolve, reject) => {
      let blockedClientSocket: any;
      let timeoutId: any;
      try {
        const testUser = await User.create({
          name: "Blocked User",
          email: "blocked@rydex.com",
          role: "user",
          isPartnerBlocked: true,
        });

        blockedClientSocket = Client(socketUrl());
        blockedClientSocket.on("connect", () => {
          blockedClientSocket.emit("identity", testUser._id.toString());
        });

        blockedClientSocket.on("blocked", (data: any) => {
          expect(data.message).toContain("suspended");
        });

        blockedClientSocket.on("disconnect", () => {
          clearTimeout(timeoutId);
          setTimeout(resolve, 50);
        });

        timeoutId = setTimeout(() => {
          blockedClientSocket.disconnect();
          reject(new Error("Socket did not disconnect automatically"));
        }, 1500);
      } catch (err) {
        clearTimeout(timeoutId);
        reject(err);
      }
    });
  });

  it("should disconnect active socket connection when blocked event is posted to /emit", () => {
    return new Promise<void>(async (resolve, reject) => {
      let activeClientSocket: any;
      let timeoutId: any;
      let innerTimeoutId: any;
      try {
        const testUser = await User.create({
          name: "Soon Blocked",
          email: "soonblocked@rydex.com",
          role: "user",
        });

        activeClientSocket = Client(socketUrl());
        activeClientSocket.on("connect", () => {
          activeClientSocket.emit("identity", testUser._id.toString());
        });

        innerTimeoutId = setTimeout(async () => {
          try {
            // Verify user was linked to a socket
            const dbUser = await User.findById(testUser._id);
            expect(dbUser.socketId).toBe(activeClientSocket.id);

            let disconnected = false;
            activeClientSocket.on("blocked", (data: any) => {
              expect(data.message).toContain("suspended");
            });

            activeClientSocket.on("disconnect", () => {
              disconnected = true;
            });

            // Post a blocked event to /emit
            await axios.post(`${socketUrl()}/emit`, {
              userId: testUser._id.toString(),
              event: "blocked",
              data: { message: "Your account is suspended." }
            }, {
              headers: { "x-socket-secret": process.env.SOCKET_INTERNAL_SECRET || "" }
            });

            // Verify client was disconnected
            expect(disconnected).toBe(true);

            clearTimeout(timeoutId);
            setTimeout(resolve, 50);
          } catch (err) {
            clearTimeout(timeoutId);
            reject(err);
          }
        }, 300);

        timeoutId = setTimeout(() => {
          clearTimeout(innerTimeoutId);
          activeClientSocket.disconnect();
          reject(new Error("Active socket was not disconnected by /emit blocked event"));
        }, 2000);
      } catch (err) {
        clearTimeout(timeoutId);
        clearTimeout(innerTimeoutId);
        reject(err);
      }
    });
  });

  it("should relay chat-typing events within the booking room", () => {
    return new Promise<void>(async (resolve, reject) => {
      let clientSocket1: ClientSocket, clientSocket2: ClientSocket;
      try {
        const bookingId = new mongoose.Types.ObjectId().toString();

        clientSocket1 = Client(socketUrl());
        clientSocket1.on("connect", () => {
          clientSocket2 = Client(socketUrl());
          clientSocket2.on("connect", () => {
            clientSocket1.emit("join-booking", bookingId);
            clientSocket2.emit("join-booking", bookingId);

            setTimeout(() => {
              clientSocket2.on("chat-typing", (data: any) => {
                try {
                  expect(data.rideId).toBe(bookingId);
                  expect(data.sender).toBe("user");
                  expect(data.isTyping).toBe(true);
                  
                  clientSocket1.disconnect();
                  clientSocket2.disconnect();
                  resolve();
                } catch (err) {
                  clientSocket1.disconnect();
                  clientSocket2.disconnect();
                  reject(err);
                }
              });

              clientSocket1.emit("chat-typing", {
                rideId: bookingId,
                sender: "user",
                isTyping: true,
              });
            }, 100);
          });
        });
      } catch (err) {
        reject(err);
      }
    });
  });

  it("should relay chat-read events within the booking room", () => {
    return new Promise<void>(async (resolve, reject) => {
      let clientSocket1: ClientSocket, clientSocket2: ClientSocket;
      try {
        const bookingId = new mongoose.Types.ObjectId().toString();

        clientSocket1 = Client(socketUrl());
        clientSocket1.on("connect", () => {
          clientSocket2 = Client(socketUrl());
          clientSocket2.on("connect", () => {
            clientSocket1.emit("join-booking", bookingId);
            clientSocket2.emit("join-booking", bookingId);

            setTimeout(() => {
              clientSocket2.on("chat-read", (data: any) => {
                try {
                  expect(data.rideId).toBe(bookingId);
                  expect(data.sender).toBe("user");
                  
                  clientSocket1.disconnect();
                  clientSocket2.disconnect();
                  resolve();
                } catch (err) {
                  clientSocket1.disconnect();
                  clientSocket2.disconnect();
                  reject(err);
                }
              });

              clientSocket1.emit("chat-read", {
                rideId: bookingId,
                sender: "user",
              });
            }, 100);
          });
        });
      } catch (err) {
        reject(err);
      }
    });
  });
});
