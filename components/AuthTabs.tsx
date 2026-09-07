import Link from "next/link";

const base =
  "flex-1 rounded-[12px] py-2 text-center text-[13px] font-bold transition-colors";
const active = "bg-[rgba(201,217,160,0.16)] text-[#eef6ea]";
const inactive = "text-[#8fa89b]";

/** Prekidač prijava/registracija na vrhu obje auth stranice. */
export function AuthTabs({ current }: { current: "login" | "register" }) {
  return (
    <div className="mb-5 flex gap-1 rounded-[14px] border border-[rgba(169,194,179,0.22)] bg-[rgba(6,20,16,0.4)] p-1">
      <Link href="/login" className={`${base} ${current === "login" ? active : inactive}`}>
        Prijavi se
      </Link>
      <Link href="/register" className={`${base} ${current === "register" ? active : inactive}`}>
        Registriraj se
      </Link>
    </div>
  );
}
