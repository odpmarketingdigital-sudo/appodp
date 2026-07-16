"use client";

import { useActionState, useEffect, useState, useTransition } from "react";

import {
  listGoogleAdsCustomersAction,
  saveGoogleAdsCustomerAction,
  type GoogleAdsCustomerFormState,
} from "@/actions/google-ads";
import type { GoogleAdsCustomerOption } from "@/types/google-ads";

const initialState: GoogleAdsCustomerFormState = { status: "idle" };

type GoogleAdsCustomerSelectorProps = {
  clientId: string;
  hasGoogleAdsToken: boolean;
  currentCustomerId: string | null;
  showOnSuccess?: boolean;
};

export function GoogleAdsCustomerSelector({
  clientId,
  hasGoogleAdsToken,
  currentCustomerId,
  showOnSuccess = false,
}: GoogleAdsCustomerSelectorProps) {
  const [customers, setCustomers] = useState<GoogleAdsCustomerOption[]>([]);
  const [managerCustomerId, setManagerCustomerId] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, startLoadTransition] = useTransition();
  const [state, formAction, pending] = useActionState(
    saveGoogleAdsCustomerAction,
    initialState,
  );

  useEffect(() => {
    if (!hasGoogleAdsToken) return;

    startLoadTransition(async () => {
      const result = await listGoogleAdsCustomersAction(clientId);
      if (result.status === "success" && result.customers) {
        setCustomers(result.customers);
        setLoadError(null);
      } else if (result.status === "error") {
        setLoadError(result.message ?? "Erro ao carregar contas do Google Ads.");
      }
    });
  }, [hasGoogleAdsToken, clientId]);

  function handleCustomerChange(customerId: string) {
    const selected = customers.find((c) => c.customerId === customerId);
    setManagerCustomerId(selected?.managerCustomerId ?? "");
  }

  if (!hasGoogleAdsToken) {
    return (
      <p className="text-sm text-zinc-500">
        Conecte o Google Ads na seção de conexões abaixo para selecionar a conta
        de anúncios deste cliente.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {showOnSuccess && (
        <div
          role="status"
          className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300"
        >
          <p className="font-medium">Google Ads conectado com sucesso!</p>
          <p className="mt-0.5 text-emerald-300/90">
            Selecione abaixo a conta de anúncios que deseja monitorar para este
            cliente.
          </p>
        </div>
      )}

      {currentCustomerId && (
        <p className="text-xs text-zinc-500">
          Conta atual:{" "}
          <span className="font-mono text-zinc-300">{currentCustomerId}</span>
        </p>
      )}

      {isLoading && (
        <p className="text-xs text-zinc-400">Carregando contas do Google Ads...</p>
      )}

      {loadError && (
        <p className="text-xs text-red-400" role="alert">
          {loadError}
        </p>
      )}

      {!isLoading && customers.length > 0 && (
        <form
          action={formAction}
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <input type="hidden" name="clientId" value={clientId} />
          <input
            type="hidden"
            name="managerCustomerId"
            value={managerCustomerId}
          />

          <div className="flex-1 space-y-1.5">
            <label
              htmlFor={`google-ads-customer-${clientId}`}
              className="block text-xs font-medium text-zinc-300"
            >
              Conta Google Ads deste cliente
            </label>
            <select
              id={`google-ads-customer-${clientId}`}
              name="customerId"
              defaultValue={currentCustomerId ?? ""}
              required
              onChange={(event) => handleCustomerChange(event.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-700"
            >
              <option value="" disabled>
                Selecione uma conta
              </option>
              {customers.map((customer) => (
                <option key={customer.customerId} value={customer.customerId}>
                  {customer.descriptiveName
                    ? `${customer.descriptiveName} (${customer.customerId})`
                    : customer.customerId}
                  {customer.managerCustomerId
                    ? ` — MCC ${customer.managerCustomerId}`
                    : ""}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={pending}
            className="inline-flex shrink-0 items-center justify-center rounded-full bg-white px-4 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Salvando..." : "Salvar"}
          </button>
        </form>
      )}

      {!isLoading && !loadError && customers.length === 0 && (
        <p className="text-xs text-zinc-500">
          Nenhuma conta Google Ads acessível encontrada para esta conexão.
        </p>
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
