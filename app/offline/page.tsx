import type { Metadata } from "next";
import { WifiOff } from "lucide-react";

export const metadata: Metadata = { title: "Nema veze · Bela Tracker" };
export const dynamic = "force-static";

export default function OfflinePage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent/14 text-accent">
        <WifiOff size={26} aria-hidden />
      </span>
      <h1 className="text-[20px] font-extrabold text-heading">Nema internetske veze</h1>
      <p className="text-[14px] text-subtle">
        Rezultati se spremaju na poslužitelj, pa unos ruke čeka vezu. Čim se veza vrati,
        osvježi stranicu.
      </p>
      {/* Obični <a>, ne Link: puna navigacija ponovno pita mrežu. */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a href="/" className="btn-accent rounded-2xl px-6 py-3 font-semibold">
        Pokušaj ponovno
      </a>
    </main>
  );
}
