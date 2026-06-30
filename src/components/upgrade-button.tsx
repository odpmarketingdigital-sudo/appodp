"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";

export function UpgradeButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpgrade() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/checkout/premium", { method: "POST" });
      if (!response.ok) {
        throw new Error("Não foi possível iniciar o checkout.");
      }
      const data = (await response.json()) as { url?: string };
      if (!data.url) {
        throw new Error("URL de checkout não retornada.");
      }
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleUpgrade}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Sparkles className="h-4 w-4" aria-hidden />
        {loading ? "Redirecionando..." : "Fazer Upgrade para Premium"}
      </button>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}
