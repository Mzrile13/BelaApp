// Best-effort in-memory rate limiter. Na serverlessu (Vercel) svaka instanca
// drži vlastitu mapu, pa ovo throttla po instanci, ne globalno — dovoljno da
// otupi brute-force lozinke bez dodatne infrastrukture. Za stroge globalne
// limite zamijeni s Upstash/Vercel KV.
type Bucket = { count: number; resetAt: number };

const store: Map<string, Bucket> =
  (globalThis as { __belaRateLimit?: Map<string, Bucket> }).__belaRateLimit ??
  new Map<string, Bucket>();
(globalThis as { __belaRateLimit?: Map<string, Bucket> }).__belaRateLimit = store;

export interface RateLimitResult {
  ok: boolean;
  retryAfterSeconds: number;
}

export function rateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number },
): RateLimitResult {
  const now = Date.now();

  // Oportunističko čišćenje da mapa ne raste neograničeno.
  if (store.size > 5000) {
    for (const [k, b] of store) {
      if (now > b.resetAt) store.delete(k);
    }
  }

  const bucket = store.get(key);
  if (!bucket || now > bucket.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSeconds: 0 };
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    return {
      ok: false,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }
  return { ok: true, retryAfterSeconds: 0 };
}
