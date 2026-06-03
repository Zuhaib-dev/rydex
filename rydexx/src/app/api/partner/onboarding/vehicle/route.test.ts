// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import User from "@/models/user.model";
import Vehicle from "@/models/vehicle.model";
import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";

// Mock auth
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

let mongoServer: MongoMemoryServer;
let GET: any;
let POST: any;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  process.env.MONGODB_URL = uri;
  await mongoose.connect(uri);

  const route = await import("./route");
  GET = route.GET;
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

describe("GET /api/partner/onboarding/vehicle", () => {
  it("should return 400 if user is unauthorized", async () => {
    vi.mocked(auth as any).mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/partner/onboarding/vehicle");
    const response = await GET(req);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.message).toBe("User unauthorized ");
  });

  it("should return vehicle details if authorized", async () => {
    const partner = await User.create({
      name: "Driver Joe",
      email: "driver@example.com",
      role: "partner",
      partnerOnboardingSteps: 1,
    });

    await Vehicle.create({
      owner: partner._id,
      vehicleModel: "Model X",
      vehicleNumber: "AB12CD3456",
      type: "car",
      baseFare: 0,
      perKmRate: 0,
      waitingCharge: 0,
      status: "pending",
    });

    vi.mocked(auth as any).mockResolvedValue({
      user: {
        email: "driver@example.com",
        name: "Driver Joe",
        role: "partner",
        id: partner._id.toString(),
      },
      expires: "tomorrow",
    });

    const req = new NextRequest("http://localhost/api/partner/onboarding/vehicle");
    const response = await GET(req);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.vehicle).toBeDefined();
    expect(body.vehicle.vehicleModel).toBe("Model X");
    expect(body.vehicle.type).toBe("car");
  });
});

describe("POST /api/partner/onboarding/vehicle", () => {
  it("should create a new vehicle and advance onboarding steps", async () => {
    const partner = await User.create({
      name: "Driver Joe",
      email: "driver@example.com",
      role: "partner",
      partnerOnboardingSteps: 0,
    });

    vi.mocked(auth as any).mockResolvedValue({
      user: {
        email: "driver@example.com",
        name: "Driver Joe",
        role: "partner",
        id: partner._id.toString(),
      },
      expires: "tomorrow",
    });

    const payload = {
      vehicleType: "car",
      vehicleModel: "Model X",
      vehicleNumber: "MH-12 AB-1234",
    };

    const req = new NextRequest("http://localhost/api/partner/onboarding/vehicle", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const response = await POST(req);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.message).toBe("Vehicle details saved successfully");

    const createdVehicle = await Vehicle.findOne({ owner: partner._id });
    expect(createdVehicle).toBeDefined();
    expect(createdVehicle?.type).toBe("car");
    expect(createdVehicle?.vehicleModel).toBe("Model X");
    expect(createdVehicle?.vehicleNumber).toBe("MH12AB1234"); // formatted without spaces/hyphens

    const updatedUser = await User.findById(partner._id);
    expect(updatedUser?.partnerOnboardingSteps).toBe(1);
  });

  it("should fail if fields are missing", async () => {
    const partner = await User.create({
      name: "Driver Joe",
      email: "driver@example.com",
      role: "partner",
      partnerOnboardingSteps: 0,
    });

    vi.mocked(auth as any).mockResolvedValue({
      user: {
        email: "driver@example.com",
        id: partner._id.toString(),
      },
      expires: "tomorrow",
    });

    const payload = {
      vehicleType: "car",
      // vehicleModel missing
      vehicleNumber: "MH-12 AB-1234",
    };

    const req = new NextRequest("http://localhost/api/partner/onboarding/vehicle", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const response = await POST(req);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.message).toBe("All fields are required");
  });

  it("should fail if vehicle type is invalid", async () => {
    const partner = await User.create({
      name: "Driver Joe",
      email: "driver@example.com",
      role: "partner",
    });

    vi.mocked(auth as any).mockResolvedValue({
      user: {
        email: "driver@example.com",
        id: partner._id.toString(),
      },
      expires: "tomorrow",
    });

    const payload = {
      vehicleType: "helicopter", // invalid type
      vehicleModel: "Model X",
      vehicleNumber: "MH-12 AB-1234",
    };

    const req = new NextRequest("http://localhost/api/partner/onboarding/vehicle", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const response = await POST(req);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.message).toBe("Invalid vehicle type selected");
  });

  it("should fail if vehicleModel is too short or too long", async () => {
    const partner = await User.create({
      name: "Driver Joe",
      email: "driver@example.com",
      role: "partner",
    });

    vi.mocked(auth as any).mockResolvedValue({
      user: {
        email: "driver@example.com",
        id: partner._id.toString(),
      },
      expires: "tomorrow",
    });

    // Too short: "a"
    let req = new NextRequest("http://localhost/api/partner/onboarding/vehicle", {
      method: "POST",
      body: JSON.stringify({
        vehicleType: "car",
        vehicleModel: "a",
        vehicleNumber: "MH-12 AB-1234",
      }),
    });
    let response = await POST(req);
    expect(response.status).toBe(400);
    let body = await response.json();
    expect(body.message).toBe("Vehicle model must be between 2 and 50 characters");

    // Too long: 51 characters
    req = new NextRequest("http://localhost/api/partner/onboarding/vehicle", {
      method: "POST",
      body: JSON.stringify({
        vehicleType: "car",
        vehicleModel: "a".repeat(51),
        vehicleNumber: "MH-12 AB-1234",
      }),
    });
    response = await POST(req);
    expect(response.status).toBe(400);
    body = await response.json();
    expect(body.message).toBe("Vehicle model must be between 2 and 50 characters");
  });

  it("should fail if vehicleModel contains invalid characters", async () => {
    const partner = await User.create({
      name: "Driver Joe",
      email: "driver@example.com",
      role: "partner",
    });

    vi.mocked(auth as any).mockResolvedValue({
      user: {
        email: "driver@example.com",
        id: partner._id.toString(),
      },
      expires: "tomorrow",
    });

    const req = new NextRequest("http://localhost/api/partner/onboarding/vehicle", {
      method: "POST",
      body: JSON.stringify({
        vehicleType: "car",
        vehicleModel: "Honda Civic #1", // contains #
        vehicleNumber: "MH-12 AB-1234",
      }),
    });
    const response = await POST(req);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.message).toBe("Vehicle model contains invalid characters");
  });

  it("should fail if vehicleNumber is invalid", async () => {
    const partner = await User.create({
      name: "Driver Joe",
      email: "driver@example.com",
      role: "partner",
    });

    vi.mocked(auth as any).mockResolvedValue({
      user: {
        email: "driver@example.com",
        id: partner._id.toString(),
      },
      expires: "tomorrow",
    });

    const req = new NextRequest("http://localhost/api/partner/onboarding/vehicle", {
      method: "POST",
      body: JSON.stringify({
        vehicleType: "car",
        vehicleModel: "Honda Civic",
        vehicleNumber: "12345", // invalid format
      }),
    });
    const response = await POST(req);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.message).toBe("Invalid vehicle number");
  });
});
