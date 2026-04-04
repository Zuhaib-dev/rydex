import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const PUBLIC_ROUTES = ["/"];
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith(".")
  ) {
    return NextResponse.next();
  }
  if (PUBLIC_ROUTES.includes(pathname)) {
    return NextResponse.next();
  }
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }
  
  const token = await getToken({ req, secret: process.env.AUTH_SECRET });
  
  if (!token) {
    return NextResponse.redirect(new URL("/", req.url));
  }
  const role = token.role;
  if (pathname.startsWith("/admin")) {
    if (role != "admin") {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  }
  if (pathname.startsWith("/video-kyc")) {
    // allow anyone who is logged in to reach the kyc page; 
    // the page itself handles internal security via database role check.
    return NextResponse.next();
  }
  if (pathname.startsWith("/partner")) {
    // allow access to onboarding and dashboard if logged in.
    return NextResponse.next();
  }
  if (pathname.startsWith("/api") || pathname.startsWith("/zego")) {
    return NextResponse.next();
  }
  return NextResponse.redirect(new URL("/", req.url));
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf|otf|css|js|map)$).*)",
  ],
};

