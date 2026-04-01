import { ChevronLeft } from "lucide-react";
import Link from "next/link";

interface BackButtonProps {
  fallbackHref?: string;
  label?: string;
  className?: string;
}

export function BackButton({
  fallbackHref = "/",
  label = "Nazad",
  className = "",
}: BackButtonProps) {
  return (
    <Link
      href={fallbackHref}
      className={`inline-flex items-center gap-1 rounded-xl border border-emerald-500 px-3 py-2 text-sm font-semibold text-emerald-100 ${className}`}
    >
      <ChevronLeft size={16} />
      {label}
    </Link>
  );
}
