"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    // U dev-u bi SW cachirao HMR chunkove i zbunjivao; registriramo samo build.
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch(() => {
        // Bez SW-a aplikacija radi jednako, samo nije instalabilna offline.
      });
  }, []);
  return null;
}
