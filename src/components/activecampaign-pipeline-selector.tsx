"use client";

import { useActionState, useEffect, useState, useTransition } from "react";

import {
  listActiveCampaignPipelinesAction,
  saveActiveCampaignPipelineAction,
  type ActiveCampaignPipelineFormState,
} from "@/actions/activecampaign";

const initialState: ActiveCampaignPipelineFormState = { status: "idle" };

type ActiveCampaignPipelineSelectorProps = {
  clientId: string;
  connected: boolean;
  currentPipelineId: string | null;
};

export function ActiveCampaignPipelineSelector({
  clientId,
  connected,
  currentPipelineId,
}: ActiveCampaignPipelineSelectorProps) {
  const [pipelines, setPipelines] = useState<
    ActiveCampaignPipelineFormState["pipelines"]
  >([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, startTransition] = useTransition();
  const [state, formAction, pending] = useActionState(
    saveActiveCampaignPipelineAction,
    initialState,
  );

  useEffect(() => {
    if (!connected) return;

    startTransition(async () => {
      const result = await listActiveCampaignPipelinesAction(clientId);
      if (result.status === "success" && result.pipelines) {
        setPipelines(result.pipelines);
        setLoadError(null);
      } else if (result.status === "error") {
        setLoadError(result.message ?? "Erro ao carregar funis.");
      }
    });
  }, [connected, clientId]);

  if (!connected) {
    return null;
  }

  return (
    <div className="mt-4 space-y-3 border-t border-zinc-800 pt-4">
      <div>
        <h4 className="text-xs font-semibold text-zinc-200">Funil monitorado</h4>
        <p className="mt-1 text-xs text-zinc-500">
          Selecione o funil cujos negócios serão exibidos no dashboard CRM.
        </p>
      </div>

      {currentPipelineId && (
        <p className="text-xs text-zinc-500">
          Funil atual:{" "}
          <span className="font-mono text-zinc-300">{currentPipelineId}</span>
        </p>
      )}

      {isLoading && (
        <p className="text-xs text-zinc-400">Carregando funis...</p>
      )}

      {loadError && (
        <p className="text-xs text-red-400" role="alert">
          {loadError}
        </p>
      )}

      {!isLoading && pipelines && pipelines.length > 0 && (
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="clientId" value={clientId} />

          <div className="space-y-1.5">
            <label
              htmlFor="ac-pipeline"
              className="block text-xs font-medium text-zinc-300"
            >
              Funil do ActiveCampaign
            </label>
            <select
              id="ac-pipeline"
              name="pipelineId"
              defaultValue={currentPipelineId ?? ""}
              required
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-700"
            >
              <option value="" disabled>
                Selecione um funil
              </option>
              {pipelines.map((pipeline) => (
                <option key={pipeline.id} value={pipeline.id}>
                  {pipeline.title}
                </option>
              ))}
            </select>
            {state.fieldErrors?.pipelineId && (
              <p className="text-xs text-red-400">
                {state.fieldErrors.pipelineId}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center justify-center rounded-full bg-white px-4 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Salvando..." : "Salvar funil"}
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
