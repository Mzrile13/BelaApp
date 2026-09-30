"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const MAX_LENGTH = 500;

export function GameComment({
  gameId,
  initialComment,
  readOnly,
}: {
  gameId: string;
  initialComment: string | null;
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(initialComment ?? "");
  const [draft, setDraft] = useState(initialComment ?? "");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setSaving(true);
    setError("");
    const response = await fetch(`/api/games/${gameId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comment: draft }),
    }).catch(() => null);
    setSaving(false);
    if (!response?.ok) {
      const body = (await response?.json().catch(() => ({}))) as { error?: string } | undefined;
      setError(body?.error ?? "Greška pri spremanju komentara");
      return;
    }
    const body = (await response.json()) as { comment: string | null };
    setSaved(body.comment ?? "");
    setDraft(body.comment ?? "");
    setEditing(false);
    router.refresh();
  }

  if (!editing) {
    if (!saved && readOnly) return null;
    return (
      <div className="rounded-[14px] border border-white/8 bg-panel/50 px-4 py-3">
        <p className="m-0 text-[11px] font-bold uppercase tracking-[0.06em] text-muted">Komentar</p>
        {saved ? (
          <p className="mt-1 whitespace-pre-wrap break-words text-sm text-ink">{saved}</p>
        ) : null}
        {readOnly ? null : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="mt-2 rounded-full border-none bg-transparent p-0 text-xs font-bold text-accent"
          >
            {saved ? "Uredi komentar" : "+ Dodaj komentar"}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-[14px] border border-white/8 bg-panel/50 px-4 py-3">
      <p className="m-0 text-[11px] font-bold uppercase tracking-[0.06em] text-muted">Komentar</p>
      <textarea
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        maxLength={MAX_LENGTH}
        rows={3}
        autoFocus
        placeholder="Kratki opis partije…"
        className="mt-2 w-full resize-none rounded-xl border border-white/12 bg-well/60 p-3 text-sm text-ink"
      />
      <div className="mt-1 text-right text-[11px] text-dim">
        {draft.length}/{MAX_LENGTH}
      </div>
      {error ? <p className="mt-1 text-xs text-danger">{error}</p> : null}
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => {
            setDraft(saved);
            setEditing(false);
            setError("");
          }}
          className="rounded-xl p-3 text-[13px] font-bold text-soft"
          style={{ border: "1px solid rgba(169,194,179,.3)", background: "transparent" }}
        >
          Odustani
        </button>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="btn-accent rounded-xl p-3 text-[13px] font-extrabold"
        >
          {saving ? "Spremam…" : "Spremi"}
        </button>
      </div>
    </div>
  );
}
