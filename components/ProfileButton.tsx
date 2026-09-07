"use client";

import { useEffect, useState } from "react";
import { KeyRound, LogOut, User, X } from "lucide-react";

type View = "menu" | "password";

export function ProfileButton({ username }: { username: string }) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("menu");

  // Zatvaranje Escapeom + zaključana pozadina dok je panel otvoren.
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  function close() {
    setOpen(false);
    setView("menu");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex max-w-[46vw] items-center gap-1.5 rounded-[10px] border border-[rgba(169,194,179,0.22)] bg-[rgba(6,20,16,0.4)] px-2.5 py-1.5 text-[11.5px] font-semibold text-[#a9c2b3]"
      >
        <User size={13} className="shrink-0" />
        <span className="truncate">{username}</span>
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Profil"
          className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(3,12,9,0.72)] p-4 backdrop-blur-[2px] sm:items-center"
          onClick={close}
        >
          <div
            className="glass-card w-full max-w-sm rounded-[22px] px-5 py-[22px] shadow-[0_24px_48px_-20px_rgba(0,0,0,0.7)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.04em] text-[#8fa89b]">
                  Prijavljeni profil
                </p>
                <p className="truncate text-[19px] font-extrabold text-[#f7fbf6]">{username}</p>
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="Zatvori"
                className="rounded-[10px] border border-[rgba(169,194,179,0.22)] bg-[rgba(6,20,16,0.4)] p-1.5 text-[#a9c2b3]"
              >
                <X size={15} />
              </button>
            </div>

            <div className="mt-4">
              {view === "menu" ? (
                <MenuView onChangePassword={() => setView("password")} />
              ) : (
                <PasswordForm onDone={close} onCancel={() => setView("menu")} />
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function MenuView({ onChangePassword }: { onChangePassword: () => void }) {
  const [loggingOut, setLoggingOut] = useState(false);

  async function logout() {
    setLoggingOut(true);
    await fetch("/api/login", { method: "DELETE" });
    // Full navigation so the proxy re-evaluates the cleared cookie.
    window.location.assign("/login");
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={onChangePassword}
        className="flex items-center gap-2.5 rounded-[14px] border border-[rgba(169,194,179,0.22)] bg-[rgba(6,20,16,0.4)] px-3.5 py-3 text-left text-[14px] font-semibold text-[#eef6ea]"
      >
        <KeyRound size={16} className="text-[#c9d9a0]" /> Promjena lozinke
      </button>
      <button
        type="button"
        onClick={logout}
        disabled={loggingOut}
        className="flex items-center gap-2.5 rounded-[14px] border border-[rgba(169,194,179,0.22)] bg-[rgba(6,20,16,0.4)] px-3.5 py-3 text-left text-[14px] font-semibold text-[#eef6ea] disabled:opacity-60"
      >
        <LogOut size={16} className="text-[#c9d9a0]" /> {loggingOut ? "Odjava..." : "Odjava"}
      </button>
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-[rgba(255,255,255,0.05)] bg-[rgba(6,20,16,0.4)] px-3 py-2.5 text-[#eef3ee] placeholder:text-[#8fa89b] focus:border-[rgba(201,217,160,0.5)] focus:outline-none";

const labelClass =
  "mb-1 block text-[11px] font-bold uppercase tracking-[0.04em] text-[#8fa89b]";

function PasswordForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const response = await fetch("/api/account/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
    });

    if (!response.ok) {
      let message = "Promjena lozinke nije uspjela";
      try {
        const body = (await response.json()) as { error?: string };
        message = body.error ?? message;
      } catch {
        // keep default message
      }
      setError(message);
      setLoading(false);
      return;
    }

    setLoading(false);
    setDone(true);
  }

  if (done) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-[13.5px] font-semibold text-[#c9d9a0]">Lozinka je promijenjena.</p>
        <button
          type="button"
          onClick={onDone}
          className="btn-accent rounded-[14px] py-3 text-center text-[15px] font-bold"
        >
          U redu
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div>
        <label className={labelClass}>Trenutna lozinka</label>
        <input
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          className={inputClass}
          required
        />
      </div>
      <div>
        <label className={labelClass}>Nova lozinka</label>
        <input
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          className={inputClass}
          required
          minLength={8}
        />
      </div>
      <div>
        <label className={labelClass}>Ponovi novu lozinku</label>
        <input
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          className={inputClass}
          required
          minLength={8}
        />
      </div>

      {error ? <p className="text-[13px] font-semibold text-rose-300">{error}</p> : null}

      <div className="mt-1 flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-[14px] border border-[rgba(169,194,179,0.22)] bg-[rgba(6,20,16,0.4)] py-3 text-center text-[14px] font-semibold text-[#a9c2b3]"
        >
          Natrag
        </button>
        <button
          type="submit"
          disabled={loading}
          className="btn-accent flex-1 rounded-[14px] py-3 text-center text-[15px] font-bold disabled:opacity-60"
        >
          {loading ? "Spremam..." : "Spremi"}
        </button>
      </div>
    </form>
  );
}
