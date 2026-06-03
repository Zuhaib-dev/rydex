// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import User from "@/models/user.model";
import Vehicle from "@/models/vehicle.model";
import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";

// Mock dependencies
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/imagekit", () => ({
  default: vi.fn().mockResolvedValue("https://ik.imagekit.io/mock-rydex/test-upload.jpg"),
}));

vi.mock("@/lib/adminEvents", () => ({
  notifyAdminDashboard: vi.fn().mockResolvedValue(true),
}));

let mongoServer: MongoMemoryServer;
let GET: any;
let POST: any;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  // Set the environment variable so the app models can connect
  process.env.MONGODB_URL = uri;
  await mongoose.connect(uri);

  // Dynamically import router handlers to prevent hoisting issues with process.env
  const route = await import("./route");
  GET = route.GET;
  POST = route.POST;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  // Clean up database collections
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
  vi.clearAllMocks();
});

describe("GET /api/partner/onboarding/pricing", () => {
  it("should return 401 if user is unauthorized", async () => {
    vi.mocked(auth as any).mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/partner/onboarding/pricing");
    const response = await GET(req);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.message).toBe("Unauthorized");
  });

  it("should return vehicle pricing details if authorized", async () => {
    // 1. Create a dummy partner user and vehicle
    const partner = await User.create({
      name: "Driver Joe",
      email: "driver@example.com",
      role: "partner",
      partnerOnboardingSteps: 5,
    });

    const vehicle = await Vehicle.create({
      owner: partner._id,
      vehicleModel: "Model X",
      vehicleNumber: "AB-1234",
      type: "car",
      baseFare: 100,
      perKmRate: 15,
      waitingCharge: 2,
      imageUrl: "https://ik.imagekit.io/some-img.jpg",
      status: "pending",
    });

    // Mock authorized session
    vi.mocked(auth as any).mockResolvedValue({
      user: {
        email: "driver@example.com",
        name: "Driver Joe",
        role: "partner",
        id: partner._id.toString(),
      },
      expires: "tomorrow",
    });

    const req = new NextRequest("http://localhost/api/partner/onboarding/pricing");
    const response = await GET(req);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.pricing).toBeDefined();
    expect(body.pricing.baseFare).toBe(100);
    expect(body.pricing.vehicleModel).toBe("Model X");
  });
});

describe("POST /api/partner/onboarding/pricing", () => {
  it("should update pricing and advance onboarding step", async () => {
    // 1. Setup DB state
    const partner = await User.create({
      name: "Driver Joe",
      email: "driver@example.com",
      role: "partner",
      partnerOnboardingSteps: 5,
      partnerStatus: "pending",
    });

    await Vehicle.create({
      owner: partner._id,
      vehicleModel: "Model X",
      vehicleNumber: "AB-1234",
      type: "car",
      baseFare: 0,
      perKmRate: 0,
      waitingCharge: 0,
      status: "pending",
    });

    // 2. Mock auth session
    vi.mocked(auth as any).mockResolvedValue({
      user: {
        email: "driver@example.com",
        name: "Driver Joe",
        role: "partner",
        id: partner._id.toString(),
      },
      expires: "tomorrow",
    });

    // 3. Create multipart formData request
    const formData = new FormData();
    formData.append("baseFare", "80");
    formData.append("perKmRate", "18");
    formData.append("waitingCharge", "3");
    
    // Simulate image upload
    const mockFile = new File(["mock-image-content"], "car.png", { type: "image/png" });
    formData.append("vehicleImage", mockFile);

    const req = new NextRequest("http://localhost/api/partner/onboarding/pricing", {
      method: "POST",
      body: formData,
    });

    const response = await POST(req);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.message).toBe("Pricing saved successfully");

    // 4. Verify DB changes
    const updatedVehicle = await Vehicle.findOne({ owner: partner._id });
    expect(updatedVehicle?.baseFare).toBe(80);
    expect(updatedVehicle?.perKmRate).toBe(18);
    expect(updatedVehicle?.imageUrl).toBe("https://ik.imagekit.io/mock-rydex/test-upload.jpg");
    expect(updatedVehicle?.status).toBe("pending");

    const updatedPartner = await User.findById(partner._id);
    expect(updatedPartner?.partnerOnboardingSteps).toBe(6);
  });

  it("should fail if pricing fields are missing", async () => {
    const partner = await User.create({
      name: "Driver Joe",
      email: "driver@example.com",
      role: "partner",
      partnerOnboardingSteps: 5,
    });

    vi.mocked(auth as any).mockResolvedValue({
      user: {
        email: "driver@example.com",
        id: partner._id.toString(),
      },
      expires: "tomorrow",
    });

    const formData = new FormData();
    formData.append("baseFare", "80");
    // perKmRate and waitingCharge are missing

    const req = new NextRequest("http://localhost/api/partner/onboarding/pricing", {
      method: "POST",
      body: formData,
    });

    const response = await POST(req);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.message).toBe("All pricing fields are required");
  });

  it("should fail if baseFare is out of range for non-truck", async () => {
    const partner = await User.create({
      name: "Driver Joe",
      email: "driver@example.com",
      role: "partner",
      partnerOnboardingSteps: 5,
    });

    await Vehicle.create({
      owner: partner._id,
      vehicleModel: "Model X",
      vehicleNumber: "AB-1234",
      type: "car",
      baseFare: 0,
      perKmRate: 0,
      waitingCharge: 0,
      status: "pending",
    });

    vi.mocked(auth as any).mockResolvedValue({
      user: {
        email: "driver@example.com",
        id: partner._id.toString(),
      },
      expires: "tomorrow",
    });

    const formData = new FormData();
    formData.append("baseFare", "120"); // Above 100 for non-truck
    formData.append("perKmRate", "18");
    formData.append("waitingCharge", "3");

    const req = new NextRequest("http://localhost/api/partner/onboarding/pricing", {
      method: "POST",
      body: formData,
    });

    const response = await POST(req);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.message).toBe("Base fare must be between 1 and 100");
  });

  it("should succeed if baseFare is 150 for a truck", async () => {
    const partner = await User.create({
      name: "Driver Joe",
      email: "driver@example.com",
      role: "partner",
      partnerOnboardingSteps: 5,
    });

    await Vehicle.create({
      owner: partner._id,
      vehicleModel: "Model Truck",
      vehicleNumber: "AB-5678",
      type: "truck",
      baseFare: 0,
      perKmRate: 0,
      waitingCharge: 0,
      status: "pending",
    });

    vi.mocked(auth as any).mockResolvedValue({
      user: {
        email: "driver@example.com",
        id: partner._id.toString(),
      },
      expires: "tomorrow",
    });

    const formData = new FormData();
    formData.append("baseFare", "150"); // Valid for truck (max 200)
    formData.append("perKmRate", "18");
    formData.append("waitingCharge", "3");

    const req = new NextRequest("http://localhost/api/partner/onboarding/pricing", {
      method: "POST",
      body: formData,
    });

    const response = await POST(req);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.message).toBe("Pricing saved successfully");
  });

  it("should fail if perKmRate is out of range", async () => {
    const partner = await User.create({
      name: "Driver Joe",
      email: "driver@example.com",
      role: "partner",
      partnerOnboardingSteps: 5,
    });

    await Vehicle.create({
      owner: partner._id,
      vehicleModel: "Model X",
      vehicleNumber: "AB-1234",
      type: "car",
      baseFare: 0,
      perKmRate: 0,
      waitingCharge: 0,
      status: "pending",
    });

    vi.mocked(auth as any).mockResolvedValue({
      user: {
        email: "driver@example.com",
        id: partner._id.toString(),
      },
      expires: "tomorrow",
    });

    const formData = new FormData();
    formData.append("baseFare", "80");
    formData.append("perKmRate", "4"); // Below 5
    formData.append("waitingCharge", "3");

    const req = new NextRequest("http://localhost/api/partner/onboarding/pricing", {
      method: "POST",
      body: formData,
    });

    const response = await POST(req);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.message).toBe("Price per KM must be between 5 and 100");
  });

  it("should fail if waitingCharge is out of range", async () => {
    const partner = await User.create({
      name: "Driver Joe",
      email: "driver@example.com",
      role: "partner",
      partnerOnboardingSteps: 5,
    });

    await Vehicle.create({
      owner: partner._id,
      vehicleModel: "Model X",
      vehicleNumber: "AB-1234",
      type: "car",
      baseFare: 0,
      perKmRate: 0,
      waitingCharge: 0,
      status: "pending",
    });

    vi.mocked(auth as any).mockResolvedValue({
      user: {
        email: "driver@example.com",
        id: partner._id.toString(),
      },
      expires: "tomorrow",
    });

    const formData = new FormData();
    formData.append("baseFare", "80");
    formData.append("perKmRate", "18");
    formData.append("waitingCharge", "11"); // Above 10

    const req = new NextRequest("http://localhost/api/partner/onboarding/pricing", {
      method: "POST",
      body: formData,
    });

    const response = await POST(req);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.message).toBe("Waiting charge must be between 1 and 10");
  });
});
