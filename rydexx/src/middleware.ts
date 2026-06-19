import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const PUBLIC_ROUTES = [
  "/",
  "/about",
  "/contact",
  "/fleet",
  "/faq",
  "/privacy",
  "/terms",
];

const PUBLIC_PREFIXES = ["/share/"];
const PUBLIC_API_PREFIXES = [
  "/api/auth",
  "/api/contact",
  "/api/payment/verify",
  "/api/vehicles/nearby",
  "/api/weather",
  "/api/socket/connect",
  "/api/booking/expire-stale",
  "/api/booking/dispatch-scheduled",
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Allow internal Next.js requests and public assets
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // 1.5 CSRF Protection: Validate Origin/Referer for state-changing requests
  if (req.method !== "GET" && req.method !== "OPTIONS") {
    // Skip CSRF for webhooks that expect external origins
    if (!pathname.startsWith("/api/payment/verify")) {
      const origin = req.headers.get("origin");
      const referer = req.headers.get("referer");
      const host = req.headers.get("host");
      const nextBaseUrl = process.env.NEXT_BASE_URL || "http://localhost:3000";

      if (origin || referer) {
        const source = origin || referer || "";
        let sourceHost = "";
        try {
          sourceHost = new URL(source).host;
        } catch {
          sourceHost = source;
        }
        
        const expectedHost = host || new URL(nextBaseUrl).host;
        
        if (sourceHost !== expectedHost) {
          return NextResponse.json(
            { message: "Forbidden: CSRF check failed (Invalid Origin)" },
            { status: 403 }
          );
        }
      }
    }
  }

  // 2. Allow public routes and public API routes
  if (
    PUBLIC_ROUTES.includes(pathname) ||
    PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ||
    PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  ) {
    return NextResponse.next();
  }

  // 3. Check for token — try secure cookie first (handles both http and https)
  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
    // secureCookie: false allows the middleware to work in http (dev) and https (prod)
    secureCookie: process.env.NODE_ENV === "production",
  });

  if (!token || token.blocked) {
    // If not logged in or session is revoked and it's an API route, return 401
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    // Redirect to home page where AuthModal can prompt for login
    return NextResponse.redirect(new URL("/", req.url));
  }

  const role = token.role as string | undefined;

  // 4. Role-based access control (RBAC)

  // Admin Routes
  if (pathname.startsWith("/admin")) {
    if (role === "admin") return NextResponse.next();
    return NextResponse.redirect(new URL("/", req.url));
  }

  // User Only Routes
  if (pathname.startsWith("/pass")) {
    if (role === "user") return NextResponse.next();
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Partner & KYC Routes
  if (pathname.startsWith("/partner") || pathname.startsWith("/video-kyc")) {
    if (
      pathname.startsWith("/partner/onboarding") ||
      pathname.startsWith("/partner/vehicle") ||
      pathname.startsWith("/video-kyc")
    ) {
      return NextResponse.next();
    }
    if (role === "partner" || role === "admin") return NextResponse.next();
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Zego (Video/Call) Routes - allow all authenticated roles for now
  if (pathname.startsWith("/zego")) {
    return NextResponse.next();
  }

  // Default allow for any other authenticated route
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf|otf|css|js|map)$).*)",
  ],
};
