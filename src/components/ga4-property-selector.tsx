"use client";

import { useActionState, useEffect, useState, useTransition } from "react";

import {
  listGa4PropertiesAction,
  saveGa4PropertyAction,
  type Ga4PropertyFormState,
} from "@/actions/ga4";
import type { GA4PropertyOption } from "@/types/ga4";

const initialState: Ga4PropertyFormState = { status: "idle" };

type Ga4PropertySelectorProps = {
  hasGa4Token: boolean;
  currentPropertyId: string | null;
};

export function Ga4PropertySelector({
  hasGa4Token,
  currentPropertyId,
}: Ga4PropertySelectorProps) {
  const [properties, setProperties] = useState<GA4PropertyOption[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, startTransition] = useTransition();
  const [state, formAction, pending] = useActionState(
    saveGa4PropertyAction,
    initialState,
  );

  useEffect(() => {
    if (!hasGa4Token) return;

    startTransition(async () => {
      const result = await listGa4PropertiesAction();
      if (result.status === "success" && result.properties) {
        setProperties(result.properties);
        setLoadError(null);
      } else if (result.status === "error") {
        setLoadError(result.message ?? "Erro ao carregar propriedades.");
      }
    });
  }, [hasGa4Token]);

  if (!hasGa4Token) {
    return (
      <p className="text-sm text-zinc-500">
        Conecte o GA4 em um cliente para selecionar a propriedade monitorada no
        dashboard.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {currentPropertyId && (
        <p className="text-xs text-zinc-500">
          Propriedade atual:{" "}
          <span className="font-mono text-zinc-300">{currentPropertyId}</span>
        </p>
      )}

      {isLoading && (
        <p className="text-xs text-zinc-400">Carregando propriedades GA4...</p>
      )}

      {loadError && (
        <p className="text-xs text-red-400" role="alert">
          {loadError}
        </p>
      )}

      {!isLoading && properties.length > 0 && (
        <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1.5">
            <label
              htmlFor="ga4-property"
              className="block text-xs font-medium text-zinc-300"
            >
              Propriedade GA4 do dashboard
            </label>
            <select
              id="ga4-property"
              name="propertyId"
              defaultValue={currentPropertyId ?? ""}
              required
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-700"
            >
              <option value="" disabled>
                Selecione uma propriedade
              </option>
              {properties.map((property) => (
                <option key={property.propertyId} value={property.propertyId}>
                  {property.displayName} ({property.propertyId})
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={pending}
            className="inline-flex shrink-0 items-center justify-center rounded-full bg-white px-4 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Salvando..." : "Salvar propriedade"}
          </button>
        </form>
      )}

      {state.status === "success" && state.message && (
        <p className="text-xs text-emerald-400" role="status">
          {state.message}
        </p>
      )}

      {state.status === "error" && state.message && (
        <p className="text-xs text-red-400" role="alert">
          {state.message}
        </p>
      )}
    </div>
  );
}
