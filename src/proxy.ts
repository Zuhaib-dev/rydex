import { NextRequest, NextResponse } from "next/server";
import { auth } from "./auth";

const PUBLIC_ROUTES = ["/"];
const PUBLIC_API = ["/api/auth"];
export async function proxy(req: NextRequest) {
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
  if (PUBLIC_API.includes(pathname)) {
    return NextResponse.next();
  }
  const session = await auth();
  if (!session) {
    return NextResponse.redirect(new URL("/", req.url));
  }
  const role = session.user?.role;
  if (pathname.startsWith("/admin")) {
    if (role != "admin") {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  }
  if (pathname.startsWith("/partner")) {
    if(pathname.startsWith('/partner/onboarding')){
      return NextResponse.next();
    }

    if (role != "partner") {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  }
  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }
  return NextResponse.redirect(new URL("/", req.url));
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf|otf|css|js|map)$).*)",
  ],
};
