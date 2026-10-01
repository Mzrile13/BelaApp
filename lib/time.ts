// Sve korisniku vidljive datume i granice (dan, sezona) računamo u vremenu
// Zagreba. Server na Vercelu radi u UTC-u, pa bi partija odigrana iza ponoći
// inače pala na prethodni dan, a server i preglednik ispisali različito vrijeme
// (hydration greška).
export const APP_TIME_ZONE = "Europe/Zagreb";

// Formatteri su skupi za izradu, a seasonOf/zagrebDay se zovu za svaku partiju.
const dayFormatter = new Intl.DateTimeFormat("sv-SE", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const dateTimeFormatter = new Intl.DateTimeFormat("hr-HR", {
  timeZone: APP_TIME_ZONE,
  dateStyle: "short",
  timeStyle: "short",
});
const dateFormatter = new Intl.DateTimeFormat("hr-HR", {
  timeZone: APP_TIME_ZONE,
  day: "numeric",
  month: "numeric",
  year: "numeric",
});

/** `YYYY-MM-DD` u Zagrebu; null za neispravan datum. */
export function zagrebDay(iso: string): string | null {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : dayFormatter.format(date);
}

/** Datum i vrijeme za prikaz, npr. "1. 10. 2026. 00:30". */
export function formatDateTime(iso: string) {
  return dateTimeFormatter.format(new Date(iso));
}

/** Samo datum za prikaz, npr. "1. 10. 2026.". */
export function formatDate(iso: string) {
  return dateFormatter.format(new Date(iso));
}
