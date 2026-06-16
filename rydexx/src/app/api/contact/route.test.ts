// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST } from "./route";
import { sendMail } from "@/lib/sendMail";
import { NextRequest } from "next/server";

vi.mock("@/lib/sendMail", () => ({
  sendMail: vi.fn().mockResolvedValue(undefined),
}));

describe("Contact form API route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 400 if required fields are missing", async () => {
    const request = new NextRequest("http://localhost/api/contact", {
      method: "POST",
      body: JSON.stringify({
        name: "Zuhaib",
        email: "",
        message: "Hello world",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.message).toContain("Required fields");
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("should return 400 if email is invalid", async () => {
    const request = new NextRequest("http://localhost/api/contact", {
      method: "POST",
      body: JSON.stringify({
        name: "Zuhaib",
        email: "notanemail",
        message: "Hello world",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.message).toContain("Invalid email");
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("should return 200 and send emails on valid data", async () => {
    const request = new NextRequest("http://localhost/api/contact", {
      method: "POST",
      body: JSON.stringify({
        name: "Zuhaib",
        email: "user@example.com",
        subject: "Partnership",
        message: "Hi let's partner",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.message).toContain("sent successfully");
    
    // Should send 2 emails (one to Zuhaib, one auto-reply to sender)
    expect(sendMail).toHaveBeenCalledTimes(2);
    expect(sendMail).toHaveBeenNthCalledWith(
      1,
      "zuhaibrashid01@gmail.com",
      expect.stringContaining("Partnership"),
      expect.stringContaining("Hi let&#039;s partner") // escaped message
    );
    expect(sendMail).toHaveBeenNthCalledWith(
      2,
      "user@example.com",
      expect.stringContaining("received your request"),
      expect.stringContaining("Got you!")
    );
  });
});
