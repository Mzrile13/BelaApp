"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LoginForm({ redirectTo }: { redirectTo: string }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      let message = "Prijava nije uspjela";
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

    // Full navigation so the proxy re-reads the new auth cookie.
    window.location.assign(redirectTo);
  }

  const inputClass =
    "w-full rounded-xl border border-[rgba(255,255,255,0.05)] bg-[rgba(6,20,16,0.4)] px-3 py-2.5 text-[#eef3ee] placeholder:text-[#8fa89b] focus:border-[rgba(201,217,160,0.5)] focus:outline-none";

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div>
        <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.04em] text-[#8fa89b]">
          Korisničko ime
        </label>
        <input
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          className={inputClass}
          required
        />
      </div>
      <div>
        <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.04em] text-[#8fa89b]">
          Lozinka
        </label>
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className={inputClass}
          required
        />
      </div>

      {error ? <p className="text-[13px] font-semibold text-rose-300">{error}</p> : null}

      <button
        type="submit"
        disabled={loading}
        className="btn-accent mt-1 rounded-[14px] py-3 text-center text-[15px] font-bold disabled:opacity-60"
      >
        {loading ? "Prijava..." : "Prijava"}
      </button>
    </form>
  );
}
