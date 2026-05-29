import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { hasModuleAccess, SEGMENT_TO_MODULE } from "@/lib/permissions";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  // Not authenticated — send to login
  if (!token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role = (token.role as string) ?? "";

  // Check if the first path segment maps to a module this role can't access
  const segment = pathname.split("/").filter(Boolean)[0] ?? "";
  const module = SEGMENT_TO_MODULE[segment];

  if (module && !hasModuleAccess(role, module)) {
    // Redirect to dashboard — they're logged in but not authorized for this module
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/clients/:path*",
    "/projects/:path*",
    "/stakeholders/:path*",
    "/pipeline/:path*",
    "/income/:path*",
    "/invoices/:path*",
    "/transactions/:path*",
    "/expenses/:path*",
    "/payroll/:path*",
    "/accounts/:path*",
    "/time-tracking/:path*",
    "/commissions/:path*",
    "/employees/:path*",
    "/users/:path*",
    "/reports/:path*",
    "/settings/:path*",
  ],
};
