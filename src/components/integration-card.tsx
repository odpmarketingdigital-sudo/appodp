"use client";

import { useActionState, useState } from "react";

import {
  saveIntegrationTokenAction,
  type IntegrationFormState,
} from "@/actions/integration";
import { IntegrationProvider } from "@/app/generated/prisma";

const initialState: IntegrationFormState = { status: "idle" };

type OAuthConfig = { url: string; label: string };

/**
 * Retorna a configuração de OAuth para provedores que usam fluxo de
 * autorização (Google/Meta) em vez do formulário manual de token.
 */
function getOAuthConfig(
  provider: IntegrationProvider,
  clientId: string,
): OAuthConfig | null {
  const encodedClientId = encodeURIComponent(clientId);

  if (
    provider === IntegrationProvider.GA4 ||
    provider === IntegrationProvider.GOOGLE_ADS
  ) {
    return {
      url: `/api/integrations/google/auth?clientId=${encodedClientId}&provider=${provider}`,
      label: "Google",
    };
  }

  if (provider === IntegrationProvider.META_ADS) {
    return {
      url: `/api/integrations/meta/auth?clientId=${encodedClientId}`,
      label: "Meta",
    };
  }

  return null;
}

type IntegrationCardProps = {
  clientId: string;
  provider: IntegrationProvider;
  label: string;
  description: string;
  connected: boolean;
  externalAccountId: string | null;
};

export function IntegrationCard({
  clientId,
  provider,
  label,
  description,
  connected,
  externalAccountId,
}: IntegrationCardProps) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    saveIntegrationTokenAction,
    initialState,
  );

  const oauth = getOAuthConfig(provider, clientId);

  return (
    <div className="flex flex-col rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-zinc-100">{label}</h3>
          <p className="mt-1 text-xs text-zinc-400">{description}</p>
        </div>
        <span
          className={
            connected
              ? "shrink-0 rounded-full bg-green-500/15 px-2.5 py-1 text-xs font-medium text-green-400"
              : "shrink-0 rounded-full bg-zinc-700/40 px-2.5 py-1 text-xs font-medium text-zinc-400"
          }
        >
          {connected ? "Conectado" : "Desconectado"}
        </span>
      </div>

      {connected && externalAccountId && (
        <p className="mt-3 truncate text-xs text-zinc-500">
          ID externo:{" "}
          <span className="font-mono text-zinc-300">{externalAccountId}</span>
        </p>
      )}

      {state.status !== "idle" && state.message && (
        <p
          className={
            state.status === "success"
              ? "mt-3 text-xs text-green-400"
              : "mt-3 text-xs text-red-400"
          }
        >
          {state.message}
        </p>
      )}

      {oauth ? (
        <a
          href={oauth.url}
          className="mt-4 inline-flex items-center justify-center self-start rounded-full border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-800"
        >
          {connected
            ? `Reconectar com ${oauth.label}`
            : `Conectar com ${oauth.label}`}
        </a>
      ) : !open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-4 inline-flex items-center justify-center self-start rounded-full border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-800"
        >
          {connected ? "Editar credenciais" : "Conectar"}
        </button>
      ) : (
        <form action={formAction} className="mt-4 space-y-3">
          <input type="hidden" name="clientId" value={clientId} />
          <input type="hidden" name="provider" value={provider} />

          <div className="space-y-1">
            <label
              htmlFor={`accessToken-${provider}`}
              className="block text-xs font-medium text-zinc-300"
            >
              Access Token
            </label>
            <input
              id={`accessToken-${provider}`}
              name="accessToken"
              type="password"
              required
              autoComplete="off"
              placeholder="Cole o token de acesso"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-700"
            />
            {state.fieldErrors?.accessToken && (
              <p className="text-xs text-red-400">
                {state.fieldErrors.accessToken}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <label
              htmlFor={`externalAccountId-${provider}`}
              className="block text-xs font-medium text-zinc-300"
            >
              External Account ID{" "}
              <span className="font-normal text-zinc-500">(opcional)</span>
            </label>
            <input
              id={`externalAccountId-${provider}`}
              name="externalAccountId"
              type="text"
              defaultValue={externalAccountId ?? ""}
              placeholder="Ex.: ID da propriedade do GA4"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-700"
            />
            {state.fieldErrors?.externalAccountId && (
              <p className="text-xs text-red-400">
                {state.fieldErrors.externalAccountId}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center justify-center rounded-full bg-white px-4 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? "Salvando..." : "Salvar"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium text-zinc-400 transition-colors hover:text-zinc-200"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
