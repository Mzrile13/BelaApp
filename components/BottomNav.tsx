"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarRange, History, Home, Plus, Trophy } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Koji putovi aktiviraju stavku (osim samog href-a). */
  match: (pathname: string) => boolean;
  primary?: boolean;
}

const ITEMS: NavItem[] = [
  { href: "/", label: "Početna", icon: Home, match: (p) => p === "/" },
  {
    href: "/leaderboard",
    label: "Ljestvica",
    icon: Trophy,
    match: (p) => p.startsWith("/leaderboard") || p.startsWith("/players") || p.startsWith("/pairs") || p.startsWith("/usporedba"),
  },
  { href: "/new-game", label: "Nova", icon: Plus, match: (p) => p.startsWith("/new-game"), primary: true },
  { href: "/sezona", label: "Sezona", icon: CalendarRange, match: (p) => p.startsWith("/sezona") },
  {
    href: "/history",
    label: "Povijest",
    icon: History,
    match: (p) => p.startsWith("/history") || p.startsWith("/active-games") || p.startsWith("/game/"),
  },
];

/** Na ovim ekranima navigacija smeta: prijava i unos ruke (tipkovnica je pri dnu). */
function isHidden(pathname: string) {
  return (
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/offline" ||
    /^\/game\/[^/]+\/(new-round|edit-round)/.test(pathname)
  );
}

export function BottomNav() {
  const pathname = usePathname() ?? "/";
  if (isHidden(pathname)) return null;

  return (
    <nav
      aria-label="Glavna navigacija"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/5 bg-sheet/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md"
    >
      <ul className="mx-auto grid max-w-3xl grid-cols-5">
        {ITEMS.map((item) => {
          const active = item.match(pathname);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold ${
                  active ? "text-accent" : "text-muted"
                }`}
              >
                {item.primary ? (
                  <span className="-mt-5 flex h-11 w-11 items-center justify-center rounded-full bg-accent text-on-accent shadow-[0_8px_20px_-6px_rgba(201,217,160,0.6)]">
                    <Icon size={22} strokeWidth={2.6} aria-hidden />
                  </span>
                ) : (
                  <Icon size={20} aria-hidden />
                )}
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
