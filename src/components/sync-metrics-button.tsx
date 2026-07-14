"use client";

import { useActionState } from "react";
import { RefreshCw } from "lucide-react";

import {
  syncClientMetricsAction,
  type SyncMetricsState,
} from "@/actions/metrics";

const initialState: SyncMetricsState = { status: "idle" };

type SyncMetricsButtonProps = {
  clientId: string;
  provider: string;
  label: string;
  disabled?: boolean;
};

export function SyncMetricsButton({
  clientId,
  provider,
  label,
  disabled,
}: SyncMetricsButtonProps) {
  const [state, formAction, pending] = useActionState(
    syncClientMetricsAction,
    initialState,
  );

  return (
    <div className="flex w-full flex-col items-stretch gap-1 sm:w-auto sm:items-end">
      <form action={formAction}>
        <input type="hidden" name="clientId" value={clientId} />
        <input type="hidden" name="provider" value={provider} />
        <button
          type="submit"
          disabled={pending || disabled}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          <RefreshCw
            className={pending ? "h-4 w-4 animate-spin" : "h-4 w-4"}
            aria-hidden
          />
          {pending ? "Sincronizando..." : `Sincronizar ${label}`}
        </button>
      </form>
      {state.status !== "idle" && state.message && (
        <p
          className={
            state.status === "success"
              ? "text-xs text-green-400"
              : "text-xs text-red-400"
          }
        >
          {state.message}
        </p>
      )}
    </div>
  );
}
