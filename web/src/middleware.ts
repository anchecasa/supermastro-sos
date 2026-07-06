import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // F2 — Redirect 301 /sos → /supermastro (UTM preservati)
  if (pathname === "/sos" || pathname.startsWith("/sos/")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace(/^\/sos/, "/supermastro") || "/supermastro";
    return NextResponse.redirect(url, 301);
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
