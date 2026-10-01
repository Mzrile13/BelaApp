import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { loadGameBundle } from "@/lib/gameData";
import { getGameScore, getWinningTeam } from "@/lib/scoring";
import { getSessionAccountId, unauthorized } from "@/lib/session";
import { formatDate } from "@/lib/time";

export const dynamic = "force-dynamic";

const SIZE = 1080;

let logoDataUri: Promise<string> | null = null;
function logo() {
  logoDataUri ??= readFile(path.join(process.cwd(), "public", "logo.png")).then(
    (buffer) => `data:image/png;base64,${buffer.toString("base64")}`,
  );
  return logoDataUri;
}

/**
 * Kvadratna slika rezultata za dijeljenje (WhatsApp, Instagram story). Iza
 * prijave je, kao i sama partija: dijeli je prijavljeni korisnik kao datoteku,
 * slika nikad nema javni URL.
 *
 * Tekst namjerno bez dijakritika: zadani font u ImageResponse ima samo osnovnu
 * latinicu, a korisnička imena su po validaciji ionako ASCII.
 */
export async function GET(_request: Request, ctx: RouteContext<"/game/[id]/share-image">) {
  const accountId = await getSessionAccountId();
  if (!accountId) return unauthorized();
  const { id } = await ctx.params;
  const bundle = await loadGameBundle(accountId, id);
  if (!bundle) return new Response("Not found", { status: 404 });

  const { game, rounds, players } = bundle;
  const score = getGameScore(rounds);
  const winner = getWinningTeam(score);
  const nameOf = (playerId: string) => players.find((p) => p.id === playerId)?.username ?? "?";
  const teams = [
    { key: "A" as const, names: game.teams.teamA.map(nameOf), points: score.teamA },
    { key: "B" as const, names: game.teams.teamB.map(nameOf), points: score.teamB },
  ];
  const date = formatDate(game.createdAt);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          padding: 80,
          background: "linear-gradient(165deg, #0d2a20 0%, #071a14 55%, #061410 100%)",
          color: "#eef3ee",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
          <img src={await logo()} width={120} height={120} style={{ borderRadius: 60 }} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 56, fontWeight: 800, color: "#f7fbf6" }}>Bela Tracker</span>
            <span style={{ fontSize: 30, color: "#8fa89b" }}>{date}</span>
          </div>
        </div>

        <div style={{ display: "flex", width: "100%", justifyContent: "space-between", gap: 40 }}>
          {teams.map((team) => {
            const won = winner === team.key;
            return (
              <div
                key={team.key}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  padding: "48px 24px",
                  borderRadius: 40,
                  background: won ? "rgba(201,217,160,0.16)" : "rgba(6,20,16,0.55)",
                  border: won ? "4px solid rgba(201,217,160,0.8)" : "4px solid rgba(255,255,255,0.06)",
                }}
              >
                <span style={{ fontSize: 30, fontWeight: 700, color: won ? "#c9d9a0" : "#8fa89b" }}>
                  {won ? "POBJEDNICI" : `TIM ${team.key}`}
                </span>
                <span style={{ fontSize: 150, fontWeight: 800, color: won ? "#d7f1c7" : "#a9c2b3" }}>
                  {team.points}
                </span>
                {team.names.map((name) => (
                  <span key={name} style={{ fontSize: 40, fontWeight: 700, color: "#eef3ee" }}>
                    {name}
                  </span>
                ))}
              </div>
            );
          })}
        </div>

        <span style={{ fontSize: 30, color: "#8fa89b" }}>
          {rounds.length} ruku · do {1001}
        </span>
      </div>
    ),
    { width: SIZE, height: SIZE, headers: { "Cache-Control": "private, no-store" } },
  );
}
