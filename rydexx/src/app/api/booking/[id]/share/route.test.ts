// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import Booking from "@/models/booking.model";
import User from "@/models/user.model";
import Vehicle from "@/models/vehicle.model";
import { NextRequest } from "next/server";

let mongoServer: MongoMemoryServer;
let GET: any;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  process.env.MONGODB_URL = uri;
  await mongoose.connect(uri);

  const route = await import("./route");
  GET = route.GET;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
  vi.clearAllMocks();
});

describe("GET /api/booking/[id]/share", () => {
  it("should return 404 for an invalid ObjectId format", async () => {
    const req = new NextRequest("http://localhost/api/booking/invalid-id/share");
    const context = { params: Promise.resolve({ id: "invalid-id" }) };

    const response = await GET(req, context);
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.message).toBe("Booking not found");
  });

  it("should return 404 if booking does not exist", async () => {
    const nonExistentId = new mongoose.Types.ObjectId().toString();
    const req = new NextRequest(`http://localhost/api/booking/${nonExistentId}/share`);
    const context = { params: Promise.resolve({ id: nonExistentId }) };

    const response = await GET(req, context);
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.message).toBe("Booking not found");
  });

  it("should return 410 for inactive booking statuses (e.g. requested)", async () => {
    const booking = await Booking.create({
      user: new mongoose.Types.ObjectId(),
      pickupAddress: "Pickup",
      dropAddress: "Drop",
      pickupLocation: { type: "Point", coordinates: [74.0, 34.0] },
      dropLocation: { type: "Point", coordinates: [74.05, 34.05] },
      fare: 150,
      status: "requested",
      userMobileNumber: "1234567890",
      vehicleType: "car",
    });

    const req = new NextRequest(`http://localhost/api/booking/${booking._id}/share`);
    const context = { params: Promise.resolve({ id: booking._id.toString() }) };

    const response = await GET(req, context);
    expect(response.status).toBe(410);
    const body = await response.json();
    expect(body.message).toBe("Share link has expired or is invalid");
  });

  it("should return 200 for active status booking and omit driver phone number", async () => {
    const partner = await User.create({
      name: "Driver Joe",
      email: "joe@rydex.com",
      role: "partner",
      partnerStatus: "approved",
      isOnline: true,
      mobileNumber: "9988776655",
      location: { type: "Point", coordinates: [74.01, 34.01] },
    });

    const vehicle = await Vehicle.create({
      owner: partner._id,
      vehicleModel: "Civic",
      vehicleNumber: "MH12XY1234",
      type: "car",
      baseFare: 100,
      perKmRate: 12,
      waitingCharge: 5,
      status: "approved",
      isActive: true,
    });

    const booking = await Booking.create({
      user: new mongoose.Types.ObjectId(),
      driver: partner._id,
      vehicle: vehicle._id,
      pickupAddress: "Pickup",
      dropAddress: "Drop",
      pickupLocation: { type: "Point", coordinates: [74.0, 34.0] },
      dropLocation: { type: "Point", coordinates: [74.05, 34.05] },
      fare: 150,
      status: "started",
      userMobileNumber: "1234567890",
      driverMobileNumber: "9988776655",
      vehicleType: "car",
    });

    const req = new NextRequest(`http://localhost/api/booking/${booking._id}/share`);
    const context = { params: Promise.resolve({ id: booking._id.toString() }) };

    const response = await GET(req, context);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.booking.driver.name).toBe("Driver Joe");
    // Ensure mobileNumber is NOT populated or returned
    expect(body.booking.driver.mobileNumber).toBeUndefined();
    expect(body.booking.driver.location.coordinates).toEqual([74.01, 34.01]);
  });

  it("should return 200 for recently completed booking but omit driver live location", async () => {
    const partner = await User.create({
      name: "Driver Joe",
      email: "joe2@rydex.com",
      role: "partner",
      partnerStatus: "approved",
      isOnline: true,
      mobileNumber: "9988776655",
      location: { type: "Point", coordinates: [74.01, 34.01] },
    });

    const booking = await Booking.create({
      user: new mongoose.Types.ObjectId(),
      driver: partner._id,
      pickupAddress: "Pickup",
      dropAddress: "Drop",
      pickupLocation: { type: "Point", coordinates: [74.0, 34.0] },
      dropLocation: { type: "Point", coordinates: [74.05, 34.05] },
      fare: 150,
      status: "completed",
      completedAt: new Date(Date.now() - 5 * 60 * 1000), // 5 mins ago
      userMobileNumber: "1234567890",
      driverMobileNumber: "9988776655",
      vehicleType: "car",
    });

    const req = new NextRequest(`http://localhost/api/booking/${booking._id}/share`);
    const context = { params: Promise.resolve({ id: booking._id.toString() }) };

    const response = await GET(req, context);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.booking.status).toBe("completed");
    expect(body.booking.driver.name).toBe("Driver Joe");
    // Ensure driver location coordinates are omitted/undefined for privacy
    expect(body.booking.driver.location).toBeUndefined();
  });

  it("should return 410 for long-completed bookings (> 15 minutes)", async () => {
    const partner = await User.create({
      name: "Driver Joe",
      email: "joe3@rydex.com",
      role: "partner",
      partnerStatus: "approved",
      isOnline: true,
      mobileNumber: "9988776655",
      location: { type: "Point", coordinates: [74.01, 34.01] },
    });

    const booking = await Booking.create({
      user: new mongoose.Types.ObjectId(),
      driver: partner._id,
      pickupAddress: "Pickup",
      dropAddress: "Drop",
      pickupLocation: { type: "Point", coordinates: [74.0, 34.0] },
      dropLocation: { type: "Point", coordinates: [74.05, 34.05] },
      fare: 150,
      status: "completed",
      completedAt: new Date(Date.now() - 20 * 60 * 1000), // 20 mins ago
      userMobileNumber: "1234567890",
      driverMobileNumber: "9988776655",
      vehicleType: "car",
    });

    const req = new NextRequest(`http://localhost/api/booking/${booking._id}/share`);
    const context = { params: Promise.resolve({ id: booking._id.toString() }) };

    const response = await GET(req, context);
    expect(response.status).toBe(410);
  });
});
