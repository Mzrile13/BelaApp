import Link from "next/link";
import { PartyPopper } from "lucide-react";
import { SeasonSwitcher, SeasonView } from "@/components/SeasonView";
import { seasonSlug } from "@/lib/season";
import type { loadSeasonPage } from "@/lib/seasonPage";

export function SeasonPageBody({ data }: { data: Awaited<ReturnType<typeof loadSeasonPage>> }) {
  const { active, currentSeason, seasons, summary, previous } = data;
  return (
    <main className="mx-auto w-full max-w-3xl p-4 pb-20">
      <h1 className="mb-1 text-[20px] font-extrabold text-heading">Sezona {active}</h1>
      <p className="mb-3 text-[12px] text-muted">
        Sezona traje od 1. listopada do 30. rujna.
        {active === currentSeason ? " Ovo je trenutna sezona." : ""}
      </p>
      <SeasonSwitcher seasons={seasons} active={active} />

      {previous ? (
        <section className="mb-3 animate-pop rounded-[18px] border border-accent/40 bg-accent/10 p-4">
          <p className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.06em] text-accent">
            <PartyPopper size={15} aria-hidden /> Završila je sezona {previous.season}
          </p>
          <p className="mt-1 text-[14px] text-ink">
            {previous.mvp ? (
              <>
                MVP: <b>{previous.mvp.username}</b>
              </>
            ) : (
              "Bez MVP-a"
            )}
            {previous.pairChampion ? (
              <>
                {" "}· Par sezone:{" "}
                <b>
                  {previous.pairChampion.playerAUsername} + {previous.pairChampion.playerBUsername}
                </b>
              </>
            ) : null}
          </p>
          <Link
            href={`/sezona/${seasonSlug(previous.season)}`}
            className="mt-2 inline-block text-[12.5px] font-bold text-accent underline underline-offset-2"
          >
            Pregled sezone {previous.season} →
          </Link>
        </section>
      ) : null}

      <SeasonView summary={summary} />
    </main>
  );
}
