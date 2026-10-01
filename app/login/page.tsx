import { redirect } from "next/navigation";
import { getSessionAccountId } from "@/lib/session";
import { AuthTabs } from "@/components/AuthTabs";
import { LoginForm } from "./LoginForm";
import { safeRedirect } from "@/lib/redirect";

export const dynamic = "force-dynamic";

function queryParamToString(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function LoginPage(props: PageProps<"/login">) {
  // Puna provjera (i otisak lozinke), ne samo potpis: inače bi token poništen
  // promjenom lozinke vrtio krug /login → / → /login.
  const alreadyAuthed = (await getSessionAccountId()) !== null;
  const searchParams = await props.searchParams;
  const target = safeRedirect(queryParamToString(searchParams?.redirect));

  if (alreadyAuthed) {
    redirect(target);
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4 p-4">
      <div className="glass-card rounded-[22px] px-5 py-7 shadow-[0_18px_36px_-18px_rgba(0,0,0,0.55)]">
        <h1 className="text-[24px] font-extrabold tracking-[-0.01em] text-heading">
          Bela Tracker
        </h1>
        <p className="mt-1.5 mb-5 text-[13.5px] leading-[1.5] text-subtle">
          Prijavi se za pristup statistici svoje grupe.
        </p>
        <AuthTabs current="login" />
        <LoginForm redirectTo={target} />
      </div>
    </main>
  );
}
