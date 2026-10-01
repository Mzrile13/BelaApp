import type { Metadata } from "next";
import Link from "next/link";
import { BackButton } from "@/components/BackButton";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { getCachedAllStats, getCachedRatingData } from "@/lib/cachedStats";
import { computeHeadToHead } from "@/lib/headToHead";
import { requireAccountId } from "@/lib/session";
import type { PlayerStats } from "@/lib/types";

export const metadata: Metadata = { title: "Usporedba · Bela Tracker" };

type Metric = {
  label: string;
  value: (row: PlayerStats) => number;
  format: (value: number) => string;
  /** Veće je bolje (default) ili manje je bolje. */
  lowerIsBetter?: boolean;
};

const pct = (value: number) => `${Math.round(value * 100)}%`;
const winRate = (row: PlayerStats) => (row.gamesPlayed ? row.gamesWon / row.gamesPlayed : 0);

const METRICS: Metric[] = [
  { label: "Rejting", value: (row) => row.rating, format: (v) => String(Math.round(v)) },
  { label: "% pobjeda", value: winRate, format: pct },
  { label: "Partija", value: (row) => row.gamesPlayed, format: String },
  { label: "Uspjeh zvanja aduta", value: (row) => row.callerSuccessRate, format: pct },
  { label: "Vrijednost zvanja / partiji", value: (row) => row.callValueAdded, format: (v) => v.toFixed(1) },
  { label: "Zvanja / partiji", value: (row) => row.avgZvanja, format: (v) => v.toFixed(1) },
  { label: "Završnica", value: (row) => row.clutchIndex, format: pct },
  { label: "Štiglje", value: (row) => row.stigliaCount, format: String },
  { label: "Najduži niz pobjeda", value: (row) => row.bestWinStreak, format: String },
];

function findByName(rows: PlayerStats[], name: string | undefined) {
  if (!name) return undefined;
  return rows.find((row) => row.username.toLowerCase() === name.toLowerCase());
}

export default async function ComparePage(props: PageProps<"/usporedba">) {
  const searchParams = await props.searchParams;
  const accountId = await requireAccountId();
  const [{ players }, ratingData] = await Promise.all([
    getCachedAllStats(accountId),
    getCachedRatingData(accountId),
  ]);
  const played = players.filter((row) => row.gamesPlayed > 0);
  const param = (key: string) => {
    const value = searchParams?.[key];
    return Array.isArray(value) ? value[0] : value;
  };
  const a = findByName(played, param("a"));
  const b = findByName(played, param("b"));
  const same = a && b && a.playerId === b.playerId;
  const h2h = a && b && !same ? computeHeadToHead(a.playerId, b.playerId, ratingData.scoredGames) : null;

  const selectClass =
    "w-full rounded-[12px] border border-subtle/25 bg-well/50 px-3 py-2.5 text-[14px] font-semibold text-heading";

  return (
    <main className="mx-auto w-full max-w-3xl p-4 pb-20">
      <BackButton fallbackHref="/leaderboard" className="mb-3" />
      <h1 className="mb-3 text-[20px] font-extrabold text-heading">Usporedba igrača</h1>

      {/* GET forma radi i bez JS-a; URL se može podijeliti. */}
      <form method="get" className="mb-4 grid grid-cols-[1fr_auto_1fr] items-end gap-2">
        <label className="flex flex-col gap-1 text-[11px] font-bold uppercase tracking-[0.05em] text-muted">
          Igrač A
          <select name="a" defaultValue={a?.username ?? ""} className={selectClass}>
            <option value="">—</option>
            {played.map((row) => (
              <option key={row.playerId} value={row.username}>
                {row.username}
              </option>
            ))}
          </select>
        </label>
        <span className="pb-3 text-[12px] font-bold text-dim">vs</span>
        <label className="flex flex-col gap-1 text-[11px] font-bold uppercase tracking-[0.05em] text-muted">
          Igrač B
          <select name="b" defaultValue={b?.username ?? ""} className={selectClass}>
            <option value="">—</option>
            {played.map((row) => (
              <option key={row.playerId} value={row.username}>
                {row.username}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="btn-accent col-span-3 rounded-[12px] py-2.5 text-[14px] font-extrabold">
          Usporedi
        </button>
      </form>

      {same ? <p className="text-[14px] text-subtle">Odaberi dva različita igrača.</p> : null}
      {!a || !b ? (
        <p className="text-[14px] text-subtle">Odaberi oba igrača za usporedbu.</p>
      ) : null}

      {a && b && h2h ? (
        <div className="flex flex-col gap-3">
          <section className="rounded-[18px] border border-accent/25 bg-accent/8 p-4">
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-center">
              {[a, b].map((row, index) => (
                <Link
                  key={row.playerId}
                  href={`/players/${row.username}`}
                  className={`flex flex-col items-center gap-1 ${index === 1 ? "order-3" : ""}`}
                >
                  <PlayerAvatar id={row.playerId} name={row.username} size="lg" />
                  <span className="max-w-full truncate text-[14px] font-extrabold text-heading">{row.username}</span>
                </Link>
              ))}
              <div className="order-2 px-2">
                <p className="font-mono text-[30px] font-extrabold leading-none text-heading">
                  {h2h.opponents.winsA}
                  <span className="px-1 text-dim">:</span>
                  {h2h.opponents.winsB}
                </p>
                <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.05em] text-muted">
                  jedan protiv drugoga
                </p>
              </div>
            </div>
            {h2h.opponents.games ? (
              <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[12px] text-subtle">
                <span>
                  Prosječna razlika: <b className="text-ink">{h2h.opponents.avgMargin > 0 ? "+" : ""}{Math.round(h2h.opponents.avgMargin)}</b> za {a.username}
                </span>
                <span className="flex items-center gap-1">
                  Zadnje:
                  {h2h.opponents.last5.map((result, index) => (
                    <span
                      key={index}
                      className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-extrabold ${
                        result === "W" ? "bg-accent text-on-accent" : "bg-well/60 text-danger"
                      }`}
                    >
                      {result}
                    </span>
                  ))}
                </span>
              </div>
            ) : (
              <p className="mt-2 text-center text-[12px] text-subtle">Još nisu igrali jedan protiv drugoga.</p>
            )}
          </section>

          <section className="rounded-[14px] bg-well/45 px-4 py-3 text-[13px] text-ink">
            <p className="text-[11.5px] font-bold uppercase tracking-[0.05em] text-muted">Kao partneri</p>
            {h2h.partners.games ? (
              <p className="mt-1">
                {h2h.partners.wins} pobjeda u {h2h.partners.games} partija ({pct(h2h.partners.winRate)})
              </p>
            ) : (
              <p className="mt-1 text-subtle">Nisu igrali u paru.</p>
            )}
          </section>

          <section className="rounded-[18px] border border-white/5 bg-panel/50 p-4">
            <h2 className="mb-2 text-[15px] font-bold text-heading">Statistika</h2>
            <table className="w-full text-[13px]">
              <thead className="sr-only">
                <tr>
                  <th>{a.username}</th>
                  <th>Metrika</th>
                  <th>{b.username}</th>
                </tr>
              </thead>
              <tbody>
                {METRICS.map((metric) => {
                  const va = metric.value(a);
                  const vb = metric.value(b);
                  const aBetter = metric.lowerIsBetter ? va < vb : va > vb;
                  const bBetter = metric.lowerIsBetter ? vb < va : vb > va;
                  const cell = (better: boolean) =>
                    `w-1/4 py-1.5 font-mono font-bold ${better ? "text-accent" : "text-subtle"}`;
                  return (
                    <tr key={metric.label} className="border-t border-white/5">
                      <td className={`${cell(aBetter)} text-left`}>
                        {metric.format(va)}
                        {aBetter ? <span className="sr-only"> (bolje)</span> : null}
                      </td>
                      <td className="py-1.5 text-center text-[12px] text-muted">{metric.label}</td>
                      <td className={`${cell(bBetter)} text-right`}>
                        {metric.format(vb)}
                        {bBetter ? <span className="sr-only"> (bolje)</span> : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        </div>
      ) : null}
    </main>
  );
}
