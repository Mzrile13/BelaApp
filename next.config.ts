import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// CSP bez noncea (dokumentirani pristup za app koja zadržava statičko/cache
// renderiranje). 'unsafe-inline' je nužan za Next-ov inline bootstrap i
// next/font stilove; script-src ostaje 'self' pa nijedan skript s tuđeg
// origina ne može biti učitan. next/font, Vercel Analytics i Speed Insights su
// svi isti origin (self), pa connect-src 'self' pokriva njihove beacone.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  // U dev-u localhost ide preko http-a; upgrade-insecure-requests bi lomio HMR.
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // Clickjacking zaštita (frame-ancestors gore + ovo za starije preglednike).
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  // HSTS samo u produkciji (preglednik ga ignorira preko http-a, ali izbjegavamo
  // pinanje localhost-a na https tijekom razvoja).
  ...(isDev
    ? []
    : [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]),
];

const nextConfig: NextConfig = {
  // Ne otkrivaj tehnologiju/verziju kroz X-Powered-By.
  poweredByHeader: false,
  allowedDevOrigins: ["192.168.1.8"],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
