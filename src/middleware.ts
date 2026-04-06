import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Simple middleware: redirect to login if no auth token
// API routes handle their own auth via requireAuth()
export function middleware(request: NextRequest) {
  const token = request.cookies.get("auth_token")?.value;
  const { pathname } = request.nextUrl;

  // Public paths (/_next and /favicon already excluded by matcher)
  if (pathname === "/login" || pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // No token → redirect to login
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|uploads/).*)"],
};
