import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, computeToken } from "@/lib/admin-auth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  const cookie = request.cookies.get(ADMIN_COOKIE);
  if (!cookie) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  const expectedToken = await computeToken(adminPassword);
  if (cookie.value !== expectedToken) {
    const response = NextResponse.redirect(new URL("/admin/login", request.url));
    response.cookies.delete(ADMIN_COOKIE);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
