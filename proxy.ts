import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE, verifySessionToken } from "@/utils/auth";

// Paths that must stay reachable without a session (the login screen itself
// and the endpoint that creates the session).
const PUBLIC_PATHS = new Set(["/login", "/api/login", "/register", "/api/register"]);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Optimistična provjera: samo potpis cookieja, bez ijednog mrežnog poziva.
  // Dokumentacija izričito kaže da proxy nije mjesto za dohvat podataka
  // ("Proxy is not intended for slow data fetching"), a pravu autorizaciju
  // svejedno radi svaka ruta i server komponenta preko lib/session.ts.
  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next();

  const isAuthed =
    (await verifySessionToken(request.cookies.get(AUTH_COOKIE)?.value)) !== null;

  if (isAuthed) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Neautorizirano" }, { status: 401 });
  }
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = "";
  loginUrl.searchParams.set("redirect", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    // Statika i ikone nikad ne trebaju proxy — svaki izuzetak ovdje je jedan
    // manje poziv funkcije po učitavanju stranice.
    "/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};
