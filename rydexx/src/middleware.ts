import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const PUBLIC_ROUTES = ["/"];
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Allow internal Next.js requests, public assets, and API routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // 2. Allow public routes
  if (PUBLIC_ROUTES.includes(pathname)) {
    return NextResponse.next();
  }

  // 3. Check for token
  const token = await getToken({ req, secret: process.env.AUTH_SECRET });
  
  if (!token) {
    // If not logged in, redirect to home (or signin if we had one)
    return NextResponse.redirect(new URL("/", req.url));
  }

  const role = token.role as string;

  // 4. Role-based access control (RBAC)

  // Admin Routes
  if (pathname.startsWith("/admin")) {
    if (role === "admin") return NextResponse.next();
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Partner & KYC Routes
  if (pathname.startsWith("/partner") || pathname.startsWith("/video-kyc")) {
    if (role === "partner" || role === "admin") return NextResponse.next();
    return NextResponse.redirect(new URL("/", req.url));
  }

  // User Routes
  if (pathname.startsWith("/user") || pathname.startsWith("/search")) {
    if (role === "user" || role === "admin") return NextResponse.next();
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

