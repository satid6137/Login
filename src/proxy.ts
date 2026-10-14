// src/proxy.ts
// Next.js 16+ เปลี่ยนชื่อ middleware.ts -> proxy.ts (functionality เดิม)
import { auth } from "@/authConfig";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isAdminRoute = req.nextUrl.pathname.startsWith("/admin") &&
    req.nextUrl.pathname !== "/admin/login";

  if (isAdminRoute && !req.auth) {
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }
});

export const config = {
  matcher: ["/admin/:path*"],
};
