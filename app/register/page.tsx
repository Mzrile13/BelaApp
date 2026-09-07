import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { AUTH_COOKIE, verifySessionToken } from "@/utils/auth";
import { AuthTabs } from "@/components/AuthTabs";
import { RegisterForm } from "./RegisterForm";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const cookieStore = await cookies();
  const alreadyAuthed =
    (await verifySessionToken(cookieStore.get(AUTH_COOKIE)?.value)) !== null;

  if (alreadyAuthed) {
    redirect("/");
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4 p-4">
      <div className="glass-card rounded-[22px] px-5 py-7 shadow-[0_18px_36px_-18px_rgba(0,0,0,0.55)]">
        <h1 className="text-[24px] font-extrabold tracking-[-0.01em] text-[#f7fbf6]">
          Bela Tracker
        </h1>
        <p className="mt-1.5 mb-5 text-[13.5px] leading-[1.5] text-[#a9c2b3]">
          Napravi grupu za svoje društvo. Korisničko ime i lozinku dijelite među
          sobom — statistika vaše grupe ostaje odvojena od svih ostalih.
        </p>
        <AuthTabs current="register" />
        <RegisterForm />
      </div>
    </main>
  );
}
