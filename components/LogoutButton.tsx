"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";

export function LogoutButton() {
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    await fetch("/api/login", { method: "DELETE" });
    // Full navigation so the proxy re-evaluates the cleared cookie.
    window.location.assign("/login");
  }

  return (
    <button
      type="button"
      onClick={logout}
      disabled={loading}
      className="flex items-center gap-1.5 rounded-[10px] border border-[rgba(169,194,179,0.22)] bg-[rgba(6,20,16,0.4)] px-2.5 py-1.5 text-[11.5px] font-semibold text-[#a9c2b3] disabled:opacity-60"
    >
      <LogOut size={13} /> {loading ? "Odjava..." : "Odjava"}
    </button>
  );
}
