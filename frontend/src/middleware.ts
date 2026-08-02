import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ADMIN_COOKIE, isValidAdminToken } from "@/lib/admin-session";
import {
  ADMIN_LOGIN_PATH,
  EMPLOYEE_LOGIN_PATH,
  SALES_PATH,
  getAdminHost,
  getEmployeeHost,
  getSalesHost,
  getStoreHost,
  hostsConfigured,
  isAdminPanelPath,
  isEmployeePanelPath,
  isSalesPath,
  normalizeHost,
} from "@/lib/domains";
import { MANAGER_COOKIE, isValidManagerToken } from "@/lib/manager-session";

function isStaticOrApi(pathname: string): boolean {
  return (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    /\.(svg|png|jpg|jpeg|gif|webp|ico)$/i.test(pathname)
  );
}

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
  const salesHost = getSalesHost();
  const { pathname } = request.nextUrl;

  if (!storeHost && !adminHost && !employeeHost && !salesHost) {
    return null;
  }

  if (isStaticOrApi(pathname)) {
    return null;
  }

  if (hostsConfigured()) {
    if (isAdminPanelPath(pathname) && adminHost && host !== adminHost) {
      if ((storeHost && host === storeHost) || (salesHost && host === salesHost)) {
        return NextResponse.redirect(new URL("/", request.url));
      }
      return redirectToHost(adminHost, request, pathname);
    }
    if (isEmployeePanelPath(pathname) && employeeHost && host !== employeeHost) {
      if ((storeHost && host === storeHost) || (salesHost && host === salesHost)) {
        return NextResponse.redirect(new URL("/", request.url));
      }
      return redirectToHost(employeeHost, request, pathname);
    }
    if (isSalesPath(pathname) && salesHost && host !== salesHost) {
      if (storeHost && host === storeHost) {
        return NextResponse.redirect(new URL("/", request.url));
      }
      return redirectToHost(salesHost, request, pathname);
    }
  }

  // fiyatgor → yalnızca mağaza (/)
  if (storeHost && host === storeHost) {
    if (isAdminPanelPath(pathname) || isEmployeePanelPath(pathname) || isSalesPath(pathname)) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return null;
  }

  // admin → yalnızca /admin/*
  if (adminHost && host === adminHost) {
    if (pathname === "/") {
      return NextResponse.redirect(new URL(ADMIN_LOGIN_PATH, request.url));
    }
    if (!isAdminPanelPath(pathname)) {
      return NextResponse.redirect(new URL(ADMIN_LOGIN_PATH, request.url));
    }
    return null;
  }

  // personel → yalnızca /yonetici/*
  if (employeeHost && host === employeeHost) {
    if (pathname === "/") {
      return NextResponse.redirect(new URL(EMPLOYEE_LOGIN_PATH, request.url));
    }
    if (!isEmployeePanelPath(pathname)) {
      return NextResponse.redirect(new URL(EMPLOYEE_LOGIN_PATH, request.url));
    }
    return null;
  }

  // satış → yalnızca /satis/*
  if (salesHost && host === salesHost) {
    if (pathname === "/") {
      return NextResponse.redirect(new URL(SALES_PATH, request.url));
    }
    if (!isSalesPath(pathname)) {
      return NextResponse.redirect(new URL(SALES_PATH, request.url));
    }
    return null;
  }

  return null;
}

export async function middleware(request: NextRequest) {
  const subdomainRedirect = applySubdomainRouting(request);
  if (subdomainRedirect) return subdomainRedirect;

  const { pathname } = request.nextUrl;

  if (isAdminPanelPath(pathname)) {
    if (pathname === ADMIN_LOGIN_PATH) {
      return NextResponse.next();
    }

    const adminSession = request.cookies.get(ADMIN_COOKIE)?.value;
    if (!(await isValidAdminToken(adminSession))) {
      const login = new URL(ADMIN_LOGIN_PATH, request.url);
      login.searchParams.set("from", pathname);
      return NextResponse.redirect(login);
    }

    return NextResponse.next();
  }

  if (isEmployeePanelPath(pathname)) {
    if (pathname === EMPLOYEE_LOGIN_PATH) {
      return NextResponse.next();
    }

    const managerSession = request.cookies.get(MANAGER_COOKIE)?.value;
    if (!(await isValidManagerToken(managerSession))) {
      const login = new URL(EMPLOYEE_LOGIN_PATH, request.url);
      login.searchParams.set("from", pathname);
      return NextResponse.redirect(login);
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
