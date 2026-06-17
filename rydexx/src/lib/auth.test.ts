// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from "vitest";
import { authConfig } from "./auth";
import User from "../models/user.model";

// Mock next-auth to prevent importing Next.js server dependencies during unit testing
vi.mock("next-auth", () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      handlers: {},
      signIn: vi.fn(),
      signOut: vi.fn(),
      auth: vi.fn(),
    })),
  };
});

// Mock connectDb so we don't need a real db connection for these unit tests
vi.mock("./db", () => ({
  default: vi.fn(),
}));

// Mock User.findOne and User.updateOne
vi.mock("../models/user.model", () => {
  return {
    default: {
      findOne: vi.fn(),
      updateOne: vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue({}),
        catch: vi.fn().mockReturnValue({}),
      }),
    },
  };
});

describe("NextAuth JWT callback throttling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockUser = {
    id: "user-id-123",
    name: "John Doe",
    email: "john@example.com",
    role: "user",
    image: "http://example.com/image.png",
  };

  it("should set lastChecked timestamp and user data on initial sign-in", async () => {
    const jwtCallback = authConfig.callbacks?.jwt;
    if (!jwtCallback) throw new Error("jwtCallback is not defined");
    const initialToken: any = {};
    const result: any = await jwtCallback({ token: initialToken, user: mockUser });

    expect(result.id).toBe(mockUser.id);
    expect(result.name).toBe(mockUser.name);
    expect(result.email).toBe(mockUser.email);
    expect(result.role).toBe(mockUser.role);
    expect(result.picture).toBe(mockUser.image);
    expect(result.lastChecked).toBeGreaterThan(0);
    expect(User.findOne).not.toHaveBeenCalled();
  });

  it("should bypass database query if validation interval has not elapsed", async () => {
    const jwtCallback = authConfig.callbacks?.jwt;
    if (!jwtCallback) throw new Error("jwtCallback is not defined");
    const now = Date.now();
    const token: any = {
      id: "user-id-123",
      email: "john@example.com",
      role: "user",
      picture: "http://example.com/image.png",
      lastChecked: now - 30000, // 30 seconds ago (interval is 60s)
    };

    const result: any = await jwtCallback({ token, user: undefined as any });

    expect(result.lastChecked).toBe(now - 30000); // timestamp unchanged
    expect(User.findOne).not.toHaveBeenCalled();
  });

  it("should query the database and update lastChecked when interval has elapsed", async () => {
    const jwtCallback = authConfig.callbacks?.jwt;
    if (!jwtCallback) throw new Error("jwtCallback is not defined");
    const now = Date.now();
    const token: any = {
      id: "user-id-123",
      email: "john@example.com",
      role: "user",
      picture: "http://example.com/image.png",
      lastChecked: now - 350000, // 350 seconds ago (interval is 5 mins = 300s)
      sessionId: "test-session-123",
    };

    // Setup User.findOne mock
    const mockFindOne = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          _id: "user-id-123",
          role: "partner",
          isPartnerBlocked: false,
          activeSessions: [{ sessionId: "test-session-123" }]
        }),
      }),
    });
    vi.mocked(User.findOne).mockImplementation(mockFindOne);

    const result: any = await jwtCallback({ token, user: undefined as any });

    expect(User.findOne).toHaveBeenCalledWith({ email: "john@example.com" });
    expect(result.role).toBe("partner"); // Updated from MongoDB
    expect(result.blocked).toBe(false);
    expect(result.lastChecked).toBeGreaterThanOrEqual(now); // updated to current time
  });

  it("should mark token as blocked if user is blocked in database", async () => {
    const jwtCallback = authConfig.callbacks?.jwt;
    if (!jwtCallback) throw new Error("jwtCallback is not defined");
    const now = Date.now();
    const token: any = {
      id: "user-id-123",
      email: "john@example.com",
      role: "user",
      picture: "http://example.com/image.png",
      lastChecked: now - 350000,
    };

    const mockFindOne = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          _id: "user-id-123",
          role: "user",
          isPartnerBlocked: true,
          activeSessions: [{ sessionId: "test-session-123" }]
        }),
      }),
    });
    vi.mocked(User.findOne).mockImplementation(mockFindOne);

    const result: any = await jwtCallback({ token, user: undefined as any });

    expect(result.blocked).toBe(true);
  });
});
