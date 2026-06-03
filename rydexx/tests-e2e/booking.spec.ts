import { test, expect } from "@playwright/test";
import mongoose from "mongoose";
import axios from "axios";
import fs from "fs";
import path from "path";

// 1. Manually parse .env.local to ensure environment variables are populated
const envPath = path.resolve(__dirname, "../.env.local");
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, "utf-8");
  for (const line of envConfig.split("\n")) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || "";
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.substring(1, value.length - 1);
      } else if (value.startsWith("'") && value.endsWith("'")) {
        value = value.substring(1, value.length - 1);
      }
      process.env[key] = value;
    }
  }
}

// Import models
import User from "../src/models/user.model";
import Vehicle from "../src/models/vehicle.model";
import Booking from "../src/models/booking.model";

// Pre-computed bcrypt hash of "Password123!"
const PASSWORD_HASH = "$2b$10$.69HVJPpjzFR4fw8/cTqRezqolMPuDihFR3kguTbLZQOvah/zsIvq";
const RIDER_EMAIL = "test-rider-e2e@example.com";
const DRIVER_EMAIL = "test-driver-e2e@example.com";

let testRiderId: string = "";
let testDriverId: string = "";
let testVehicleId: string = "";

test.describe("Rydex Booking Flow E2E Tests", () => {
  
  test.beforeAll(async () => {
    const mongoUrl = process.env.MONGODB_URL;
    if (!mongoUrl) {
      throw new Error("MONGODB_URL not found in environment variables");
    }
    await mongoose.connect(mongoUrl);

    // Clean up any existing E2E seed data
    await User.deleteOne({ email: RIDER_EMAIL });
    await User.deleteOne({ email: DRIVER_EMAIL });
    await Vehicle.deleteOne({ vehicleNumber: "E2E-MOCK-123" });

    // Seed test rider
    const rider = await User.create({
      name: "Test Rider E2E",
      email: RIDER_EMAIL,
      password: PASSWORD_HASH,
      role: "user",
      isEmailVerified: true,
      mobileNumber: "1234567890",
    });
    testRiderId = rider._id.toString();

    // Seed test driver
    const driver = await User.create({
      name: "Test Driver E2E",
      email: DRIVER_EMAIL,
      password: PASSWORD_HASH,
      role: "partner",
      isEmailVerified: true,
      partnerStatus: "approved",
      isOnline: true,
      isPartnerAvailable: true,
      location: {
        type: "Point",
        coordinates: [74.7979, 33.9189], // Chadoora, Budgam
      },
      lastLocationAt: new Date(),
      mobileNumber: "9876543210",
    });
    testDriverId = driver._id.toString();

    // Seed active vehicle for the driver
    const vehicle = await Vehicle.create({
      owner: driver._id,
      type: "car",
      vehicleModel: "Model S E2E Mock",
      vehicleNumber: "E2E-MOCK-123",
      baseFare: 100,
      perKmRate: 15,
      waitingCharge: 2,
      status: "approved",
      isActive: true,
    });
    testVehicleId = vehicle._id.toString();

    // Seed location in Redis if available
    try {
      const RedisModule = require("ioredis");
      const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";
      const redis = new RedisModule(redisUrl);
      await redis.geoadd("driver:locations:active", 74.7979, 33.9189, testDriverId);
      await redis.quit();
      console.log("[E2E Seed] Successfully populated Redis location");
    } catch (err: any) {
      console.warn("[E2E Seed] Redis geolocation seed skipped or failed (falling back to Mongo):", err.message);
    }
  });

  test.afterAll(async () => {
    // Delete seeded mock data
    await User.deleteOne({ email: RIDER_EMAIL });
    await User.deleteOne({ email: DRIVER_EMAIL });
    await Vehicle.deleteOne({ vehicleNumber: "E2E-MOCK-123" });
    await Booking.deleteMany({ user: testRiderId });

    try {
      const RedisModule = require("ioredis");
      const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";
      const redis = new RedisModule(redisUrl);
      await redis.zrem("driver:locations:active", testDriverId);
      await redis.quit();
    } catch {}

    await mongoose.disconnect();
  });

  test("should authenticate, fill booking form, discover driver, and complete checkout", async ({ page }) => {
    // 1. Authenticate via Navbar auth modal
    await page.goto("/");
    const navLoginButton = page.locator("button:has-text('Login')").first();
    await expect(navLoginButton).toBeVisible();
    await navLoginButton.click();

    // Fill credentials
    const emailInput = page.locator("input[placeholder='Email']");
    await expect(emailInput).toBeVisible();
    await emailInput.fill(RIDER_EMAIL);

    const passwordInput = page.locator("input[placeholder='Password']");
    await expect(passwordInput).toBeVisible();
    await passwordInput.fill("Password123!");

    // Submit form
    const modalSubmitButton = page.locator("div[role='dialog'] button:has-text('Login')");
    await expect(modalSubmitButton).toBeVisible();
    await modalSubmitButton.click();

    // Verify modal closes and user is logged in by looking for avatar or navigating
    await page.waitForTimeout(1000);

    // 2. Navigate to Booking Page
    await page.goto("/user/book");

    // Select vehicle category "Car"
    const carCategoryButton = page.locator("button:has-text('Car')");
    await expect(carCategoryButton).toBeVisible();
    await carCategoryButton.click();

    // Enter phone number
    const phoneInput = page.locator("input[placeholder='Enter 10-digit phone number']");
    await expect(phoneInput).toBeVisible();
    await phoneInput.fill("1234567890");

    // Set pickup & drop locations using coordinates shortcuts
    const chadooraPickup = page.locator("button:has-text('Chadoora (Budgam)')");
    await expect(chadooraPickup).toBeVisible();
    await chadooraPickup.click();

    const chanaporaDrop = page.locator("button:has-text('Chanapora (Srinagar)')");
    await expect(chanaporaDrop).toBeVisible();
    await chanaporaDrop.click();

    // Search Rates & Drivers
    const searchButton = page.locator("button:has-text('Search Rates & Drivers')");
    await expect(searchButton).toBeVisible();
    await searchButton.click();

    // 3. Discovery Page verification
    await page.waitForURL(/\/user\/search/);
    
    // Verify that our seeded "Model S E2E Mock" vehicle shows up
    const quoteCard = page.locator("div:has(h3:has-text('Model S E2E Mock'))");
    await expect(quoteCard.first()).toBeVisible({ timeout: 10000 });

    // Click "Book" on the quote card
    const bookButton = quoteCard.locator("button:has-text('Book')").first();
    await expect(bookButton).toBeVisible();
    await bookButton.click();

    // 4. Checkout Page
    await page.waitForURL(/\/checkout/);
    
    const requestRideButton = page.locator("button:has-text('Request Ride')");
    await expect(requestRideButton).toBeVisible();
    await requestRideButton.click();

    // Verify status changes to "requested" (spinner shown)
    await expect(page.locator("text=Searching nearby riders…").first()).toBeVisible();

    // 5. Driver accept simulation (via direct DB edit & websocket event emit)
    // Find the requested booking
    const activeBooking = await Booking.findOne({
      user: testRiderId,
      status: "requested"
    });
    expect(activeBooking).not.toBeNull();
    const bookingId = activeBooking!._id.toString();

    // Transition status to awaiting_payment
    await Booking.findByIdAndUpdate(bookingId, {
      status: "awaiting_payment",
      paymentDeadline: new Date(Date.now() + 5 * 60 * 1000)
    });

    // Notify client via websocket bridge
    const socketServerUrl = process.env.NEXT_PUBLIC_SOCKET_SERVER || "http://localhost:8000";
    await axios.post(`${socketServerUrl}/emit`, {
      userId: testRiderId,
      event: "booking-updated",
      data: {
        bookingId,
        status: "awaiting_payment",
        eventId: `e2e-${Date.now()}`,
        at: Date.now()
      },
      bookingId
    });

    // 6. Checkout Payment Step Verification
    // Expect select payment title to appear
    await expect(page.locator("text=Select Payment")).toBeVisible({ timeout: 10000 });

    // Choose cash payment option
    const cashOption = page.locator("button:has-text('Cash')");
    await expect(cashOption).toBeVisible();
    await cashOption.click();

    // Confirm Cash Ride
    const confirmCashButton = page.locator("button:has-text('Confirm Cash Ride')");
    await expect(confirmCashButton).toBeVisible();
    await confirmCashButton.click();

    // 7. Verify final redirect to Ride tracking page
    await page.waitForURL(/\/ride\//);
    expect(page.url()).toContain(`/ride/${bookingId}`);
  });
});
