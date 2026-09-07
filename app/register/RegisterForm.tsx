"use client";

import { useState } from "react";

export function RegisterForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const response = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, confirmPassword }),
    });

    if (!response.ok) {
      let message = "Registracija nije uspjela";
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
    window.location.assign("/");
  }

  const inputClass =
    "w-full rounded-xl border border-[rgba(255,255,255,0.05)] bg-[rgba(6,20,16,0.4)] px-3 py-2.5 text-[#eef3ee] placeholder:text-[#8fa89b] focus:border-[rgba(201,217,160,0.5)] focus:outline-none";
  const labelClass =
    "mb-1 block text-[11px] font-bold uppercase tracking-[0.04em] text-[#8fa89b]";

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div>
        <label className={labelClass}>Korisničko ime grupe</label>
        <input
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          className={inputClass}
          minLength={3}
          maxLength={24}
          required
        />
      </div>
      <div>
        <label className={labelClass}>Lozinka</label>
        <input
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className={inputClass}
          minLength={8}
          required
        />
      </div>
      <div>
        <label className={labelClass}>Ponovi lozinku</label>
        <input
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          className={inputClass}
          minLength={8}
          required
        />
      </div>

      {error ? <p className="text-[13px] font-semibold text-rose-300">{error}</p> : null}

      <button
        type="submit"
        disabled={loading}
        className="btn-accent mt-1 rounded-[14px] py-3 text-center text-[15px] font-bold disabled:opacity-60"
      >
        {loading ? "Kreiranje..." : "Napravi grupu"}
      </button>
    </form>
  );
}
