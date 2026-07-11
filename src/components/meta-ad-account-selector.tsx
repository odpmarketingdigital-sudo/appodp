"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState, useTransition } from "react";

import {
  listMetaAdAccountsAction,
  saveMetaAdAccountAction,
  type MetaAdAccountFormState,
} from "@/actions/meta";
import type { MetaAdAccount } from "@/types/meta";

const initialState: MetaAdAccountFormState = { status: "idle" };

type MetaAdAccountSelectorProps = {
  clientId: string;
  hasMetaToken: boolean;
  currentAdAccountId: string | null;
  showOnSuccess?: boolean;
};

export function MetaAdAccountSelector({
  clientId,
  hasMetaToken,
  currentAdAccountId,
  showOnSuccess = false,
}: MetaAdAccountSelectorProps) {
  const router = useRouter();
  const [accounts, setAccounts] = useState<MetaAdAccount[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, startLoadTransition] = useTransition();
  const [state, formAction, pending] = useActionState(
    saveMetaAdAccountAction,
    initialState,
  );

  useEffect(() => {
    if (!hasMetaToken) return;

    startLoadTransition(async () => {
      const result = await listMetaAdAccountsAction(clientId);
      if (result.status === "success" && result.accounts) {
        setAccounts(result.accounts);
        setLoadError(null);
      } else if (result.status === "error") {
        setLoadError(result.message ?? "Erro ao carregar contas de anúncios.");
      }
    });
  }, [hasMetaToken, clientId]);

  useEffect(() => {
    if (state.status === "success") {
      router.refresh();
    }
  }, [state.status, router]);

  if (!hasMetaToken) {
    return (
      <p className="text-sm text-zinc-500">
        Conecte o Meta Ads na seção de conexões abaixo para selecionar a conta
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
          <p className="font-medium">Meta conectado com sucesso!</p>
          <p className="mt-0.5 text-emerald-300/90">
            Selecione abaixo a conta de anúncios que deseja monitorar para este
            cliente.
          </p>
        </div>
      )}

      {currentAdAccountId && (
        <p className="text-xs text-zinc-500">
          Conta atual:{" "}
          <span className="font-mono text-zinc-300">{currentAdAccountId}</span>
        </p>
      )}

      {isLoading && (
        <p className="text-xs text-zinc-400">Carregando contas de anúncios...</p>
      )}

      {loadError && (
        <p className="text-xs text-red-400" role="alert">
          {loadError}
        </p>
      )}

      {!isLoading && accounts.length > 0 && (
        <form
          action={formAction}
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <input type="hidden" name="clientId" value={clientId} />

          <div className="flex-1 space-y-1.5">
            <label
              htmlFor={`meta-ad-account-${clientId}`}
              className="block text-xs font-medium text-zinc-300"
            >
              Conta de anúncios Meta deste cliente
            </label>
            <select
              id={`meta-ad-account-${clientId}`}
              name="adAccountId"
              defaultValue={currentAdAccountId ?? ""}
              required
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-700"
            >
              <option value="" disabled>
                Selecione uma conta
              </option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} ({account.id})
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

      {!isLoading && !loadError && accounts.length === 0 && (
        <p className="text-xs text-zinc-500">
          Nenhuma conta de anúncios encontrada para esta conexão Meta.
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
