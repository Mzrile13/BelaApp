import Link from "next/link";

const TABS = [
  { href: "/leaderboard", label: "Igrači" },
  { href: "/leaderboard/pairs", label: "Parovi" },
  { href: "/leaderboard/categories", label: "Kategorije" },
] as const;

export function LeaderboardTabs({ active }: { active: (typeof TABS)[number]["href"] }) {
  return (
    <div className="mb-3.5 flex gap-1.5 rounded-[12px] border border-[rgba(255,255,255,0.05)] bg-[rgba(6,20,16,0.5)] p-1">
      {TABS.map((tab) =>
        tab.href === active ? (
          <span
            key={tab.href}
            className="flex-1 rounded-[9px] bg-[#c9d9a0] py-[9px] text-center text-[12.5px] font-bold text-[#10261c]"
          >
            {tab.label}
          </span>
        ) : (
          <Link
            key={tab.href}
            href={tab.href}
            className="flex-1 rounded-[9px] py-[9px] text-center text-[12.5px] font-bold text-[#a9c2b3]"
          >
            {tab.label}
          </Link>
        ),
      )}
    </div>
  );
}
