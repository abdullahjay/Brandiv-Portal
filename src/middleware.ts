import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { hasModuleAccess, SEGMENT_TO_MODULE } from "@/lib/permissions";
import { authHeaderNames } from "@backend/lib/requestAuth";

function withAuthHeaders(req: NextRequest, token: Record<string, unknown>) {
  const requestHeaders = new Headers(req.headers);
  const names = authHeaderNames();
  const userId = (token.id as string | undefined) ?? (token.sub as string | undefined) ?? "";

  requestHeaders.set(names.id, userId);
  requestHeaders.set(names.name, (token.name as string | undefined) ?? "");
  requestHeaders.set(names.email, (token.email as string | undefined) ?? "");
  requestHeaders.set(names.role, (token.role as string | undefined) ?? "staff");

  const avatar = token.avatarUrl as string | null | undefined;
  if (avatar) requestHeaders.set(names.avatar, avatar);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (pathname.startsWith("/api/")) {
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
    return withAuthHeaders(req, token);
  }

  if (!token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role = (token.role as string) ?? "";
  const segment = pathname.split("/").filter(Boolean)[0] ?? "";
  const module = SEGMENT_TO_MODULE[segment];

  if (module && !hasModuleAccess(role, module)) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return withAuthHeaders(req, token);
}

export const config = {
  matcher: [
    "/api/:path*",
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
    "/compensation/:path*",
    "/transfers/:path*",
  ],
};
