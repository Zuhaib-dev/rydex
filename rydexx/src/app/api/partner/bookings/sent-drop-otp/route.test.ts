// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import Booking from "@/models/booking.model";
import User from "@/models/user.model";
import { auth } from "@/lib/auth";
import { emitBookingUpdated } from "@/lib/bookingEvents";
import { NextRequest } from "next/server";

// Mock dependencies
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/bookingEvents", () => ({
  emitBookingUpdated: vi.fn().mockResolvedValue(true),
}));

let mongoServer: MongoMemoryServer;
let POST: any;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  process.env.MONGODB_URL = uri;
  await mongoose.connect(uri);

  // Dynamically import router handler to prevent environment hoisting issues
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

describe("POST /api/partner/bookings/sent-drop-otp", () => {
  it("should return 401 if user is unauthorized", async () => {
    vi.mocked(auth as any).mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/partner/bookings/sent-drop-otp", {
      method: "POST",
      body: JSON.stringify({ bookingId: new mongoose.Types.ObjectId().toString() }),
    });

    const response = await POST(req);
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.message).toBe("Unauthorized");
  });

  it("should return 404 if booking is not found", async () => {
    vi.mocked(auth as any).mockResolvedValue({
      user: { id: new mongoose.Types.ObjectId().toString() },
      expires: "tomorrow",
    });

    const req = new NextRequest("http://localhost/api/partner/bookings/sent-drop-otp", {
      method: "POST",
      body: JSON.stringify({ bookingId: new mongoose.Types.ObjectId().toString() }),
    });

    const response = await POST(req);
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.message).toBe("Booking not found");
  });

  it("should return 403 if driver does not match session user", async () => {
    const driverId = new mongoose.Types.ObjectId();
    const otherDriverId = new mongoose.Types.ObjectId();

    vi.mocked(auth as any).mockResolvedValue({
      user: { id: otherDriverId.toString() },
      expires: "tomorrow",
    });

    const booking = await Booking.create({
      user: new mongoose.Types.ObjectId(),
      driver: driverId,
      vehicle: new mongoose.Types.ObjectId(),
      pickupAddress: "Pickup 1",
      dropAddress: "Drop 1",
      pickupLocation: { type: "Point", coordinates: [0, 0] },
      dropLocation: { type: "Point", coordinates: [0, 0] },
      userMobileNumber: "+1234567890",
      driverMobileNumber: "+0987654321",
      fare: 200,
      status: "started",
    });

    const req = new NextRequest("http://localhost/api/partner/bookings/sent-drop-otp", {
      method: "POST",
      body: JSON.stringify({ bookingId: booking._id.toString() }),
    });

    const response = await POST(req);
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.message).toBe("Forbidden");
  });

  it("should return 409 if booking is not in 'started' state", async () => {
    const driverId = new mongoose.Types.ObjectId();

    vi.mocked(auth as any).mockResolvedValue({
      user: { id: driverId.toString() },
      expires: "tomorrow",
    });

    // Booking is in 'confirmed' state, not 'started'
    const booking = await Booking.create({
      user: new mongoose.Types.ObjectId(),
      driver: driverId,
      vehicle: new mongoose.Types.ObjectId(),
      pickupAddress: "Pickup 1",
      dropAddress: "Drop 1",
      pickupLocation: { type: "Point", coordinates: [0, 0] },
      dropLocation: { type: "Point", coordinates: [0, 0] },
      userMobileNumber: "+1234567890",
      driverMobileNumber: "+0987654321",
      fare: 200,
      status: "confirmed",
    });

    const req = new NextRequest("http://localhost/api/partner/bookings/sent-drop-otp", {
      method: "POST",
      body: JSON.stringify({ bookingId: booking._id.toString() }),
    });

    const response = await POST(req);
    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.message).toBe("Booking must be started before sending drop OTP");
  });

  it("should generate OTP, update database, and emit event on success", async () => {
    const driverId = new mongoose.Types.ObjectId();
    const rider = await User.create({
      name: "Rider Joe",
      email: "rider@example.com",
      role: "user",
    });

    vi.mocked(auth as any).mockResolvedValue({
      user: { id: driverId.toString() },
      expires: "tomorrow",
    });

    const booking = await Booking.create({
      user: rider._id,
      driver: driverId,
      vehicle: new mongoose.Types.ObjectId(),
      pickupAddress: "Pickup 1",
      dropAddress: "Drop 1",
      pickupLocation: { type: "Point", coordinates: [0, 0] },
      dropLocation: { type: "Point", coordinates: [0, 0] },
      userMobileNumber: "+1234567890",
      driverMobileNumber: "+0987654321",
      fare: 250,
      status: "started",
    });

    const req = new NextRequest("http://localhost/api/partner/bookings/sent-drop-otp", {
      method: "POST",
      body: JSON.stringify({ bookingId: booking._id.toString() }),
    });

    const response = await POST(req);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.message).toBe("drop OTP sent");

    // Check DB changes
    const updatedBooking = await Booking.findById(booking._id);
    expect(updatedBooking?.dropOtp).toBeDefined();
    expect(updatedBooking?.dropOtp?.length).toBe(4);
    expect(updatedBooking?.dropOtpExpires).toBeDefined();

    // Check socket event called
    expect(emitBookingUpdated).toHaveBeenCalled();
  });
});
