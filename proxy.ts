import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";
import { AUTH_COOKIE, verifySessionToken } from "@/utils/auth";

// Paths that must stay reachable without a session (the login screen itself
// and the endpoint that creates the session).
const PUBLIC_PATHS = new Set(["/login", "/api/login"]);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.has(pathname);
  const isAuthed = await verifySessionToken(request.cookies.get(AUTH_COOKIE)?.value);

  if (!isAuthed && !isPublic) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Neautorizirano" }, { status: 401 });
    }
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
