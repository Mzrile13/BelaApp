import Link from "next/link";

const base =
  "flex-1 rounded-[12px] py-2 text-center text-[13px] font-bold transition-colors";
const active = "bg-accent/16 text-ink";
const inactive = "text-muted";

/** Prekidač prijava/registracija na vrhu obje auth stranice. */
export function AuthTabs({ current }: { current: "login" | "register" }) {
  return (
    <div className="mb-5 flex gap-1 rounded-[14px] border border-subtle/22 bg-well/40 p-1">
      <Link href="/login" className={`${base} ${current === "login" ? active : inactive}`}>
        Prijavi se
      </Link>
      <Link href="/register" className={`${base} ${current === "register" ? active : inactive}`}>
        Registriraj se
      </Link>
    </div>
  );
}
