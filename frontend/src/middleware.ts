import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ADMIN_COOKIE, isValidAdminToken } from "@/lib/admin-session";
import {
  getAdminHost,
  getEmployeeHost,
  getStoreHost,
  normalizeHost,
} from "@/lib/domains";
import { MANAGER_COOKIE, isValidManagerToken } from "@/lib/manager-session";

function redirectToHost(host: string, request: NextRequest, pathname: string): NextResponse {
  const url = new URL(request.url);
  url.hostname = host;
  url.pathname = pathname;
  url.search = request.nextUrl.search;
  url.port = "";
  url.protocol = "https:";
  return NextResponse.redirect(url);
}

function applySubdomainRouting(request: NextRequest): NextResponse | null {
  const host = normalizeHost(request.headers.get("host"));
  const storeHost = getStoreHost();
  const adminHost = getAdminHost();
  const employeeHost = getEmployeeHost();
  const { pathname } = request.nextUrl;

  if (!storeHost && !adminHost && !employeeHost) {
    return null;
  }

  if (adminHost && host === adminHost) {
    if (pathname === "/") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    if (pathname.startsWith("/yonetici") && employeeHost) {
      return redirectToHost(employeeHost, request, pathname);
    }
    if (
      !pathname.startsWith("/admin") &&
      !pathname.startsWith("/api") &&
      !pathname.startsWith("/_next")
    ) {
      return redirectToHost(storeHost ?? adminHost, request, pathname);
    }
    return null;
  }

  if (employeeHost && host === employeeHost) {
    if (pathname === "/") {
      return NextResponse.redirect(new URL("/yonetici", request.url));
    }
    if (pathname.startsWith("/admin") && adminHost) {
      return redirectToHost(adminHost, request, pathname);
    }
    if (
      !pathname.startsWith("/yonetici") &&
      !pathname.startsWith("/api") &&
      !pathname.startsWith("/_next")
    ) {
      return redirectToHost(storeHost ?? employeeHost, request, pathname);
    }
    return null;
  }

  if (storeHost && host === storeHost) {
    if (pathname.startsWith("/admin") && adminHost) {
      return redirectToHost(adminHost, request, pathname);
    }
    if (pathname.startsWith("/yonetici") && employeeHost) {
      return redirectToHost(employeeHost, request, pathname);
    }
  }

  return null;
}

export async function middleware(request: NextRequest) {
  const subdomainRedirect = applySubdomainRouting(request);
  if (subdomainRedirect) return subdomainRedirect;

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
  matcher: [
    "/",
    "/admin",
    "/admin/:path*",
    "/yonetici",
    "/yonetici/:path*",
  ],
};
