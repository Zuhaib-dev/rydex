// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import Booking from "@/models/booking.model";
import User from "@/models/user.model";
import Vehicle from "@/models/vehicle.model";
import { auth } from "@/lib/auth";
import { dispatchBookingToPartner } from "@/lib/matching/dispatch";

// Mock Auth
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

// Mock dispatchBookingToPartner
vi.mock("@/lib/matching/dispatch", () => ({
  dispatchBookingToPartner: vi.fn().mockResolvedValue({}),
}));

// Mock Redis to fail
vi.mock("@/lib/redis", () => ({
  getRedisClient: vi.fn().mockImplementation(() => {
    throw new Error("Redis connection failed");
  }),
}));

let mongoServer: MongoMemoryServer;
let POST: any;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  process.env.MONGODB_URL = uri;
  await mongoose.connect(uri);

  const route = await import("./route");
  POST = route.POST;
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

describe("POST /api/admin/bookings/force-dispatch", () => {
  it("should force-dispatch a booking successfully even if Redis is down", async () => {
    // 1. Mock admin session
    vi.mocked(auth as any).mockResolvedValue({
      user: {
        id: new mongoose.Types.ObjectId().toString(),
        role: "admin",
      },
    });

    // 2. Create partner & vehicle
    const partner = await User.create({
      name: "Super Driver",
      email: "partner@rydex.com",
      role: "partner",
      partnerStatus: "approved",
      isOnline: true,
      location: { type: "Point", coordinates: [74.0, 34.0] },
    });

    const vehicle = await Vehicle.create({
      owner: partner._id,
      vehicleModel: "Model 3",
      vehicleNumber: "MH12AB9999",
      type: "car",
      baseFare: 100,
      perKmRate: 12,
      waitingCharge: 5,
      status: "approved",
      isActive: true,
    });

    // 3. Create booking
    const oldDriverId = new mongoose.Types.ObjectId();
    const booking = await Booking.create({
      user: new mongoose.Types.ObjectId(),
      driver: oldDriverId,
      vehicle: new mongoose.Types.ObjectId(),
      pickupAddress: "Pickup Spot",
      dropAddress: "Drop Spot",
      pickupLocation: { type: "Point", coordinates: [74.0, 34.0] },
      dropLocation: { type: "Point", coordinates: [74.05, 34.05] },
      fare: 200,
      status: "requested",
      userMobileNumber: "1234567890",
      driverMobileNumber: "9876543210",
      vehicleType: "car",
    });

    // 4. Send Request
    const payload = {
      bookingId: booking._id.toString(),
      partnerId: partner._id.toString(),
    };

    const req = new Request("http://localhost/api/admin/bookings/force-dispatch", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const response = await POST(req);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.message).toContain("Super Driver");

    // Verify DB update
    const updatedBooking = await Booking.findById(booking._id);
    expect(String(updatedBooking?.driver)).toBe(partner._id.toString());
    expect(String(updatedBooking?.vehicle)).toBe(vehicle._id.toString());
    expect(updatedBooking?.status).toBe("requested");

    // Verify dispatchBookingToPartner was called
    expect(dispatchBookingToPartner).toHaveBeenCalled();
  });
});
