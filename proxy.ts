import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE, verifySessionToken } from "@/utils/auth";

// Paths that must stay reachable without a session (the login screen itself
// and the endpoint that creates the session).
// /offline mora raditi i kad je sesija istekla — SW ga poslužuje bez mreže.
const PUBLIC_PATHS = new Set(["/login", "/api/login", "/register", "/api/register", "/offline"]);

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * CSRF brana za API izmjene. SameSite=Lax štiti rute s cookiejem, ali ne i
 * /api/login (napadač bi žrtvu mogao prijaviti u svoj račun). Preglednik uvijek
 * šalje Sec-Fetch-Site ili Origin; ne-preglednički klijenti (curl, testovi) ne
 * šalju ništa, a oni ionako nemaju tuđi cookie pa ih puštamo.
 */
function isCrossSiteWrite(request: NextRequest) {
  if (SAFE_METHODS.has(request.method)) return false;
  const site = request.headers.get("sec-fetch-site");
  if (site) return site !== "same-origin" && site !== "none";
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host !== request.headers.get("host");
  } catch {
    return true;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/") && isCrossSiteWrite(request)) {
    return NextResponse.json({ error: "Zabranjeno" }, { status: 403 });
  }

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
    "/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|manifest.webmanifest|sw\\.js$|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};
