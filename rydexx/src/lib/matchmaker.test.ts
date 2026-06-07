// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import Booking from "@/models/booking.model";
import { findClosestEligiblePartner } from "./matching/findPartner";
import { dispatchBookingToPartner } from "./matching/dispatch";
import { emitBookingUpdated } from "./bookingEvents";

// Mock matchmaker dependencies
vi.mock("./matching/findPartner", () => ({
  findClosestEligiblePartner: vi.fn(),
}));

vi.mock("./matching/dispatch", () => ({
  dispatchBookingToPartner: vi.fn(),
}));

vi.mock("./bookingEvents", () => ({
  emitBookingUpdated: vi.fn(),
}));

vi.mock("./socketServer", () => ({
  emitToSocketServer: vi.fn(),
}));

// Mock Redis to fail
vi.mock("@/lib/redis", () => ({
  getRedisClient: vi.fn().mockImplementation(() => {
    throw new Error("Redis down");
  }),
}));

let mongoServer: MongoMemoryServer;
let cascadeBooking: any;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  process.env.MONGODB_URL = uri;
  await mongoose.connect(uri);

  const mod = await import("./matchmaker");
  cascadeBooking = mod.cascadeBooking;
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

describe("cascadeBooking - Redis Down Resiliency", () => {
  it("should successfully cascade and assign a new driver even if Redis is unavailable", async () => {
    const driverId = new mongoose.Types.ObjectId();
    const otherDriverId = new mongoose.Types.ObjectId();
    const vehicleId = new mongoose.Types.ObjectId();

    // Create a booking requested by a user and assigned to driverId
    const booking = await Booking.create({
      user: new mongoose.Types.ObjectId(),
      driver: driverId,
      vehicle: vehicleId,
      pickupAddress: "Pickup Location",
      dropAddress: "Drop Location",
      pickupLocation: { type: "Point", coordinates: [74.0, 34.0] },
      dropLocation: { type: "Point", coordinates: [74.1, 34.1] },
      fare: 150,
      tripDistanceKm: 5,
      durationMinutes: 15,
      status: "requested",
      attemptedDrivers: [driverId],
      vehicleType: "car",
      driverMobileNumber: "1234567890",
      userMobileNumber: "0987654321",
    });

    // Mock finding another driver
    vi.mocked(findClosestEligiblePartner).mockResolvedValue({
      partnerId: otherDriverId.toString(),
      vehicleId: vehicleId.toString(),
      mobileNumber: "9876543210",
      distanceMeters: 800,
      roadDistanceMeters: 1000,
      etaMinutes: 4,
      vehicleType: "car",
    });

    // Call cascadeBooking (which simulates driver rejecting the ride)
    const result = await cascadeBooking(booking._id.toString(), driverId.toString());

    // Should return success despite Redis being down
    expect(result.success).toBe(true);
    expect(result.cascaded).toBe(true);
    expect(result.nextDriverId).toBe(otherDriverId.toString());

    // Verify booking was updated in DB
    const updatedBooking = await Booking.findById(booking._id);
    expect(updatedBooking?.status).toBe("requested");
    expect(String(updatedBooking?.driver)).toBe(otherDriverId.toString());
    expect(updatedBooking?.attemptedDrivers.map(String)).toContain(otherDriverId.toString());
  });

  it("should fail gracefully and set booking to rejected if no other drivers available when Redis is down", async () => {
    const driverId = new mongoose.Types.ObjectId();
    const vehicleId = new mongoose.Types.ObjectId();

    const booking = await Booking.create({
      user: new mongoose.Types.ObjectId(),
      driver: driverId,
      vehicle: vehicleId,
      pickupAddress: "Pickup Location",
      dropAddress: "Drop Location",
      pickupLocation: { type: "Point", coordinates: [74.0, 34.0] },
      dropLocation: { type: "Point", coordinates: [74.1, 34.1] },
      fare: 150,
      tripDistanceKm: 5,
      durationMinutes: 15,
      status: "requested",
      attemptedDrivers: [driverId],
      vehicleType: "car",
      driverMobileNumber: "1234567890",
      userMobileNumber: "0987654321",
    });

    // Mock no other driver found
    vi.mocked(findClosestEligiblePartner).mockResolvedValue(null);

    const result = await cascadeBooking(booking._id.toString(), driverId.toString());

    expect(result.success).toBe(true);
    expect(result.cascaded).toBe(false);

    // Verify booking is set to rejected
    const updatedBooking = await Booking.findById(booking._id);
    expect(updatedBooking?.status).toBe("rejected");
  });
});
