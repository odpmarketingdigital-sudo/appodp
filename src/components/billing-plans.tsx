"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";

import { STRIPE_PLANS, TRIAL_PERIOD_DAYS } from "@/lib/plans";

export function BillingPlans() {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSelect(priceId: string) {
    setLoading(priceId);
    setError(null);
    try {
      const response = await fetch("/api/checkout/premium", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error ?? "Não foi possível iniciar o checkout.");
      }
      const data = (await response.json()) as { url?: string };
      if (!data.url) {
        throw new Error("URL de checkout não retornada.");
      }
      globalThis.location.assign(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
      setLoading(null);
    }
  }

  return (
    <div className="w-full space-y-4">
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Todos os planos incluem{" "}
        <span className="font-medium text-violet-400">
          {TRIAL_PERIOD_DAYS} dias grátis
        </span>
        . Cancele quando quiser.
      </p>

      <div className="grid gap-3 grid-cols-1 md:grid-cols-3">
        {STRIPE_PLANS.map((plan) => (
          <div
            key={plan.id}
            className="flex flex-col rounded-xl border border-zinc-800 bg-zinc-900/50 p-4"
          >
            <h3 className="text-sm font-semibold text-zinc-100">{plan.name}</h3>
            <p className="mt-1 text-2xl font-bold text-zinc-50">
              {plan.priceLabel}
              <span className="text-xs font-normal text-zinc-500">/mês</span>
            </p>
            <p className="mt-2 text-xs text-zinc-400">
              Até {plan.clientLimit} clientes
            </p>
            <button
              type="button"
              onClick={() => handleSelect(plan.priceId)}
              disabled={loading !== null}
              className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              {loading === plan.priceId ? "Redirecionando..." : "Assinar"}
            </button>
          </div>
        ))}
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
