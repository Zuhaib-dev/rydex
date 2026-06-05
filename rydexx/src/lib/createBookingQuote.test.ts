// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import Vehicle from "@/models/vehicle.model";
import Coupon from "@/models/coupon.model";
import { fetchDrivingRoute } from "@/lib/mapboxRouting";

// Mock Mapbox Routing
vi.mock("@/lib/mapboxRouting", () => ({
  fetchDrivingRoute: vi.fn(),
}));

// Mock Redis to simulate fallback to MongoDB
vi.mock("@/lib/redis", () => ({
  getRedisClient: vi.fn().mockImplementation(() => {
    throw new Error("Redis connection failed");
  }),
}));

let mongoServer: MongoMemoryServer;
let createLockedBookingQuote: any;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  process.env.MONGODB_URL = uri;
  await mongoose.connect(uri);

  // Import after setting process.env.MONGODB_URL
  const mod = await import("./createBookingQuote");
  createLockedBookingQuote = mod.createLockedBookingQuote;
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

describe("createLockedBookingQuote - Distance Sanitization", () => {
  it("should create a quote successfully when distance is within limits for a bike", async () => {
    // Create vehicle
    const vehicle = await Vehicle.create({
      owner: new mongoose.Types.ObjectId(),
      type: "bike",
      vehicleModel: "Ninja 300",
      vehicleNumber: "BIKE123",
      baseFare: 20,
      perKmRate: 5,
      waitingCharge: 2,
      status: "approved",
      isActive: true,
    });

    // Mock Mapbox route with 5 km distance
    vi.mocked(fetchDrivingRoute).mockResolvedValue({
      distanceMeters: 5000,
      durationSeconds: 600,
      distanceKm: 5,
      durationMinutes: 10,
      polyline: { type: "LineString", coordinates: [[0, 0], [1, 1]] },
    } as any);

    const result = await createLockedBookingQuote({
      userId: new mongoose.Types.ObjectId().toString(),
      pickupAddress: "A",
      dropAddress: "B",
      pickupLng: 74.0,
      pickupLat: 34.0,
      dropLng: 74.05,
      dropLat: 34.05,
      vehicleId: vehicle._id.toString(),
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.snapshot.tripDistanceKm).toBe(5);
      expect(result.snapshot.fare).toBe(45); // baseFare (20) + 5 * perKmRate (5) = 45
    }
  });

  it("should fail to create a quote when distance is too short for a bike (less than 100 meters)", async () => {
    const vehicle = await Vehicle.create({
      owner: new mongoose.Types.ObjectId(),
      type: "bike",
      vehicleModel: "Ninja 300",
      vehicleNumber: "BIKE123",
      baseFare: 20,
      perKmRate: 5,
      waitingCharge: 2,
      status: "approved",
      isActive: true,
    });

    // Mock Mapbox route with 50 meters (0.05 km)
    vi.mocked(fetchDrivingRoute).mockResolvedValue({
      distanceMeters: 50,
      durationSeconds: 30,
      distanceKm: 0.05,
      durationMinutes: 1,
      polyline: { type: "LineString", coordinates: [[0, 0], [0.0001, 0.0001]] },
    } as any);

    const result = await createLockedBookingQuote({
      userId: new mongoose.Types.ObjectId().toString(),
      pickupAddress: "A",
      dropAddress: "B",
      pickupLng: 74.0,
      pickupLat: 34.0,
      dropLng: 74.0005,
      dropLat: 34.0005,
      vehicleId: vehicle._id.toString(),
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.message).toContain("too short");
      expect(result.message).toContain("100 meters");
    }
  });

  it("should fail to create a quote when distance is too long for a bike (greater than 100 km)", async () => {
    const vehicle = await Vehicle.create({
      owner: new mongoose.Types.ObjectId(),
      type: "bike",
      vehicleModel: "Ninja 300",
      vehicleNumber: "BIKE123",
      baseFare: 20,
      perKmRate: 5,
      waitingCharge: 2,
      status: "approved",
      isActive: true,
    });

    // Mock Mapbox route with 105 km
    vi.mocked(fetchDrivingRoute).mockResolvedValue({
      distanceMeters: 105000,
      durationSeconds: 7200,
      distanceKm: 105,
      durationMinutes: 120,
      polyline: { type: "LineString", coordinates: [[0, 0], [1, 1]] },
    } as any);

    const result = await createLockedBookingQuote({
      userId: new mongoose.Types.ObjectId().toString(),
      pickupAddress: "A",
      dropAddress: "B",
      pickupLng: 74.0,
      pickupLat: 34.0,
      dropLng: 75.0,
      dropLat: 35.0,
      vehicleId: vehicle._id.toString(),
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.message).toContain("too long");
      expect(result.message).toContain("100 km");
    }
  });

  it("should fail to create a quote when distance is too short for a car (less than 500 meters)", async () => {
    const vehicle = await Vehicle.create({
      owner: new mongoose.Types.ObjectId(),
      type: "car",
      vehicleModel: "Corolla",
      vehicleNumber: "CAR123",
      baseFare: 50,
      perKmRate: 15,
      waitingCharge: 5,
      status: "approved",
      isActive: true,
    });

    // Mock Mapbox route with 300 meters (0.3 km)
    vi.mocked(fetchDrivingRoute).mockResolvedValue({
      distanceMeters: 300,
      durationSeconds: 120,
      distanceKm: 0.3,
      durationMinutes: 2,
      polyline: { type: "LineString", coordinates: [[0, 0], [0.001, 0.001]] },
    } as any);

    const result = await createLockedBookingQuote({
      userId: new mongoose.Types.ObjectId().toString(),
      pickupAddress: "A",
      dropAddress: "B",
      pickupLng: 74.0,
      pickupLat: 34.0,
      dropLng: 74.001,
      dropLat: 34.001,
      vehicleId: vehicle._id.toString(),
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.message).toContain("too short");
      expect(result.message).toContain("500 meters");
    }
  });

  it("should fail to create a quote when distance is too long for a car (greater than 200 km)", async () => {
    const vehicle = await Vehicle.create({
      owner: new mongoose.Types.ObjectId(),
      type: "car",
      vehicleModel: "Corolla",
      vehicleNumber: "CAR123",
      baseFare: 50,
      perKmRate: 15,
      waitingCharge: 5,
      status: "approved",
      isActive: true,
    });

    // Mock Mapbox route with 250 km
    vi.mocked(fetchDrivingRoute).mockResolvedValue({
      distanceMeters: 250000,
      durationSeconds: 15000,
      distanceKm: 250,
      durationMinutes: 250,
      polyline: { type: "LineString", coordinates: [[0, 0], [2, 2]] },
    } as any);

    const result = await createLockedBookingQuote({
      userId: new mongoose.Types.ObjectId().toString(),
      pickupAddress: "A",
      dropAddress: "B",
      pickupLng: 74.0,
      pickupLat: 34.0,
      dropLng: 76.0,
      dropLat: 36.0,
      vehicleId: vehicle._id.toString(),
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.message).toContain("too long");
      expect(result.message).toContain("200 km");
    }
  });

  it("should create a quote successfully when distance is within limits for a truck", async () => {
    const vehicle = await Vehicle.create({
      owner: new mongoose.Types.ObjectId(),
      type: "truck",
      vehicleModel: "F-150",
      vehicleNumber: "TRUCK123",
      baseFare: 500,
      perKmRate: 50,
      waitingCharge: 20,
      status: "approved",
      isActive: true,
    });

    // Mock Mapbox route with 1500 km
    vi.mocked(fetchDrivingRoute).mockResolvedValue({
      distanceMeters: 1500000,
      durationSeconds: 90000,
      distanceKm: 1500,
      durationMinutes: 1500,
      polyline: { type: "LineString", coordinates: [[0, 0], [10, 10]] },
    } as any);

    const result = await createLockedBookingQuote({
      userId: new mongoose.Types.ObjectId().toString(),
      pickupAddress: "A",
      dropAddress: "B",
      pickupLng: 74.0,
      pickupLat: 34.0,
      dropLng: 84.0,
      dropLat: 44.0,
      vehicleId: vehicle._id.toString(),
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.snapshot.tripDistanceKm).toBe(1500);
      expect(result.snapshot.fare).toBe(75500); // 500 + 1500 * 50 = 75500
    }
  });
});

describe("createLockedBookingQuote - Coupon Engine", () => {
  let vehicle: any;
  const userId = new mongoose.Types.ObjectId().toString();

  beforeEach(async () => {
    // Create an approved vehicle for testing
    vehicle = await Vehicle.create({
      owner: new mongoose.Types.ObjectId(),
      type: "car",
      vehicleModel: "Corolla",
      vehicleNumber: "CAR777",
      baseFare: 50,
      perKmRate: 10,
      waitingCharge: 2,
      status: "approved",
      isActive: true,
    });

    // Mock 5 km route -> Base calculated fare = 50 + 5 * 10 = 100
    vi.mocked(fetchDrivingRoute).mockResolvedValue({
      distanceMeters: 5000,
      durationSeconds: 600,
      distanceKm: 5,
      durationMinutes: 10,
      polyline: { type: "LineString", coordinates: [[0, 0], [1, 1]] },
    } as any);
  });

  it("should apply flat coupon successfully", async () => {
    await Coupon.create({
      code: "FLAT50",
      discountType: "flat",
      discountValue: 50,
      expiryDate: new Date(Date.now() + 100000),
      isActive: true,
    });

    const result = await createLockedBookingQuote({
      userId,
      pickupAddress: "A",
      dropAddress: "B",
      pickupLng: 74.0,
      pickupLat: 34.0,
      dropLng: 74.05,
      dropLat: 34.05,
      vehicleId: vehicle._id.toString(),
      promoCode: "FLAT50",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.snapshot.originalFare).toBe(100);
      expect(result.snapshot.discount).toBe(50);
      expect(result.snapshot.fare).toBe(50);
      expect(result.snapshot.promoCode).toBe("FLAT50");
    }
  });

  it("should apply percentage coupon successfully", async () => {
    await Coupon.create({
      code: "PERC10",
      discountType: "percentage",
      discountValue: 10,
      expiryDate: new Date(Date.now() + 100000),
      isActive: true,
    });

    const result = await createLockedBookingQuote({
      userId,
      pickupAddress: "A",
      dropAddress: "B",
      pickupLng: 74.0,
      pickupLat: 34.0,
      dropLng: 74.05,
      dropLat: 34.05,
      vehicleId: vehicle._id.toString(),
      promoCode: "PERC10",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.snapshot.discount).toBe(10); // 10% of 100
      expect(result.snapshot.fare).toBe(90);
    }
  });

  it("should respect max discount cap for percentage coupon", async () => {
    await Coupon.create({
      code: "PERC50CAP",
      discountType: "percentage",
      discountValue: 50, // 50% of 100 is 50
      maxDiscount: 30,  // Cap is 30
      expiryDate: new Date(Date.now() + 100000),
      isActive: true,
    });

    const result = await createLockedBookingQuote({
      userId,
      pickupAddress: "A",
      dropAddress: "B",
      pickupLng: 74.0,
      pickupLat: 34.0,
      dropLng: 74.05,
      dropLat: 34.05,
      vehicleId: vehicle._id.toString(),
      promoCode: "PERC50CAP",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.snapshot.discount).toBe(30); // Capped at 30
      expect(result.snapshot.fare).toBe(70);
    }
  });

  it("should not apply coupon if minBookingAmount is not met", async () => {
    await Coupon.create({
      code: "MIN150",
      discountType: "flat",
      discountValue: 50,
      minBookingAmount: 150, // Fare is only 100
      expiryDate: new Date(Date.now() + 100000),
      isActive: true,
    });

    const result = await createLockedBookingQuote({
      userId,
      pickupAddress: "A",
      dropAddress: "B",
      pickupLng: 74.0,
      pickupLat: 34.0,
      dropLng: 74.05,
      dropLat: 34.05,
      vehicleId: vehicle._id.toString(),
      promoCode: "MIN150",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.snapshot.discount).toBe(0);
      expect(result.snapshot.fare).toBe(100);
      expect(result.snapshot.promoCode).toBeUndefined();
    }
  });

  it("should not apply coupon if user has already redeemed it", async () => {
    await Coupon.create({
      code: "ONCEONLY",
      discountType: "flat",
      discountValue: 50,
      expiryDate: new Date(Date.now() + 100000),
      isActive: true,
      usedByUsers: [new mongoose.Types.ObjectId(userId)], // User already used it
    });

    const result = await createLockedBookingQuote({
      userId,
      pickupAddress: "A",
      dropAddress: "B",
      pickupLng: 74.0,
      pickupLat: 34.0,
      dropLng: 74.05,
      dropLat: 34.05,
      vehicleId: vehicle._id.toString(),
      promoCode: "ONCEONLY",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.snapshot.discount).toBe(0);
      expect(result.snapshot.fare).toBe(100);
    }
  });

  it("should not apply expired coupon", async () => {
    await Coupon.create({
      code: "EXPIRED",
      discountType: "flat",
      discountValue: 50,
      expiryDate: new Date(Date.now() - 100000), // Expired in the past
      isActive: true,
    });

    const result = await createLockedBookingQuote({
      userId,
      pickupAddress: "A",
      dropAddress: "B",
      pickupLng: 74.0,
      pickupLat: 34.0,
      dropLng: 74.05,
      dropLat: 34.05,
      vehicleId: vehicle._id.toString(),
      promoCode: "EXPIRED",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.snapshot.discount).toBe(0);
      expect(result.snapshot.fare).toBe(100);
    }
  });
});
