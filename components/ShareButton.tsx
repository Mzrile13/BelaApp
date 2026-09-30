"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";

interface ShareButtonProps {
  imageUrl: string;
  text: string;
  fileName?: string;
}

type Status = "idle" | "working" | "downloaded" | "copied" | "error";

/**
 * Dijeli sliku rezultata kroz sistemski izbornik (WhatsApp, Viber...). Gdje
 * dijeljenje datoteka nije podržano (desktop), sliku preuzme; ako ni to ne
 * uspije, kopira tekst rezultata.
 */
export function ShareButton({ imageUrl, text, fileName = "bela-rezultat.png" }: ShareButtonProps) {
  const [status, setStatus] = useState<Status>("idle");

  async function share() {
    setStatus("working");
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error(String(response.status));
      const blob = await response.blob();
      const file = new File([blob], fileName, { type: "image/png" });

      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], text });
          setStatus("idle");
        } catch (error) {
          // Korisnik je zatvorio izbornik — nije greška.
          setStatus(error instanceof DOMException && error.name === "AbortError" ? "idle" : "error");
        }
        return;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStatus("downloaded");
    } catch {
      try {
        await navigator.clipboard.writeText(text);
        setStatus("copied");
      } catch {
        setStatus("error");
      }
    }
  }

  const label =
    status === "working"
      ? "Pripremam..."
      : status === "downloaded"
        ? "Slika preuzeta"
        : status === "copied"
          ? "Rezultat kopiran"
          : status === "error"
            ? "Dijeljenje nije uspjelo"
            : "Podijeli";

  return (
    <button
      type="button"
      onClick={share}
      disabled={status === "working"}
      aria-live="polite"
      className="flex items-center justify-center gap-2 rounded-2xl border border-accent/50 py-3 font-semibold text-accent disabled:opacity-60"
    >
      <Share2 size={18} aria-hidden />
      {label}
    </button>
  );
}
