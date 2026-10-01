/** Cilj za `?redirect=` nakon prijave: samo put unutar aplikacije, inače "/". */
export function safeRedirect(target: string) {
  // Samo putovi unutar aplikacije. Provjera prefiksa nije dovoljna: preglednik
  // `/\evil.com` i `/<tab>/evil.com` čita kao `//evil.com`. Zato parsiramo kao
  // URL i tražimo da ostane na istom (izmišljenom) originu.
  if (!target.startsWith("/")) return "/";
  try {
    const url = new URL(target, "http://bela.invalid");
    if (url.origin !== "http://bela.invalid") return "/";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}
