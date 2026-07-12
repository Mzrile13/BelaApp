import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { AUTH_COOKIE, verifySessionToken } from "@/utils/auth";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

function queryParamToString(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function safeRedirect(target: string) {
  // Only allow same-origin app paths to avoid open-redirects.
  return target.startsWith("/") && !target.startsWith("//") ? target : "/";
}

export default async function LoginPage(props: PageProps<"/login">) {
  const cookieStore = await cookies();
  const alreadyAuthed = await verifySessionToken(cookieStore.get(AUTH_COOKIE)?.value);
  const searchParams = await props.searchParams;
  const target = safeRedirect(queryParamToString(searchParams?.redirect));

  if (alreadyAuthed) {
    redirect(target);
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4 p-4">
      <div className="glass-card rounded-[22px] px-5 py-7 shadow-[0_18px_36px_-18px_rgba(0,0,0,0.55)]">
        <h1 className="text-[24px] font-extrabold tracking-[-0.01em] text-[#f7fbf6]">
          Bela Tracker
        </h1>
        <p className="mt-1.5 mb-5 text-[13.5px] leading-[1.5] text-[#a9c2b3]">
          Prijavi se za pristup aplikaciji.
        </p>
        <LoginForm redirectTo={target} />
      </div>
    </main>
  );
}
