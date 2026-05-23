import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ADMIN_COOKIE, isValidAdminToken } from "@/lib/admin-session";
import { MANAGER_COOKIE, isValidManagerToken } from "@/lib/manager-session";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin")) {
    if (pathname === "/admin/login") {
      return NextResponse.next();
    }

    const adminSession = request.cookies.get(ADMIN_COOKIE)?.value;
    if (!(await isValidAdminToken(adminSession))) {
      const login = new URL("/admin/login", request.url);
      login.searchParams.set("from", pathname);
      return NextResponse.redirect(login);
    }

    return NextResponse.next();
  }

  if (pathname.startsWith("/yonetici")) {
    if (pathname === "/yonetici/login") {
      return NextResponse.next();
    }

    const managerSession = request.cookies.get(MANAGER_COOKIE)?.value;
    if (!(await isValidManagerToken(managerSession))) {
      const login = new URL("/yonetici/login", request.url);
      login.searchParams.set("from", pathname);
      return NextResponse.redirect(login);
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*", "/yonetici", "/yonetici/:path*"],
};
