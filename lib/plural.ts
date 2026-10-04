/**
 * Hrvatsko slaganje imenice s brojem: 1, 21, 31… uzimaju jedninu ("21 ruka"),
 * 2–4, 22–24… paukal ("3 ruke"), a sve ostalo, uključujući 11–14, genitiv
 * množine ("5 ruku", "12 ruku").
 */
export function plural(count: number, one: string, few: string, many: string): string {
  const n = Math.abs(Math.trunc(count));
  const lastTwo = n % 100;
  const last = n % 10;
  if (last === 1 && lastTwo !== 11) return one;
  if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return few;
  return many;
}

export const partija = (n: number) => `${n} ${plural(n, "partija", "partije", "partija")}`;
export const ruka = (n: number) => `${n} ${plural(n, "ruka", "ruke", "ruku")}`;
export const igrac = (n: number) => `${n} ${plural(n, "igrač", "igrača", "igrača")}`;
