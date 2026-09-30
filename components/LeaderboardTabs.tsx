import Link from "next/link";

const TABS = [
  { href: "/leaderboard", label: "Igrači" },
  { href: "/leaderboard/pairs", label: "Parovi" },
  { href: "/leaderboard/categories", label: "Kategorije" },
] as const;

export function LeaderboardTabs({ active }: { active: (typeof TABS)[number]["href"] }) {
  return (
    <div className="mb-3.5 flex gap-1.5 rounded-[12px] border border-white/5 bg-well/50 p-1">
      {TABS.map((tab) =>
        tab.href === active ? (
          <span
            key={tab.href}
            className="flex-1 rounded-[9px] bg-accent py-[9px] text-center text-[12.5px] font-bold text-on-accent"
          >
            {tab.label}
          </span>
        ) : (
          <Link
            key={tab.href}
            href={tab.href}
            className="flex-1 rounded-[9px] py-[9px] text-center text-[12.5px] font-bold text-subtle"
          >
            {tab.label}
          </Link>
        ),
      )}
    </div>
  );
}
