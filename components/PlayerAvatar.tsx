import clsx from "clsx";
import { avatarFor, initialOf } from "@/lib/avatar";

const SIZES = {
  xs: "h-[18px] w-[18px] text-[10px]",
  sm: "h-6 w-6 text-[11px]",
  md: "h-8 w-8 text-[13px]",
  lg: "h-12 w-12 text-[20px]",
} as const;

interface PlayerAvatarProps {
  id: string;
  name: string;
  size?: keyof typeof SIZES;
  className?: string;
}

/** Krug s inicijalom. Ime se uvijek prikazuje pored, pa je avatar skriven čitačima ekrana. */
export function PlayerAvatar({ id, name, size = "sm", className }: PlayerAvatarProps) {
  const { bg, fg } = avatarFor(id);
  return (
    <span
      aria-hidden
      className={clsx(
        "inline-flex flex-shrink-0 items-center justify-center rounded-full font-extrabold leading-none",
        SIZES[size],
        className,
      )}
      style={{ background: bg, color: fg }}
    >
      {initialOf(name)}
    </span>
  );
}
