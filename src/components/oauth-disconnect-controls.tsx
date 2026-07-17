"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

import { IntegrationProvider } from "@/app/generated/prisma";

type DisconnectIntegrationDialogProps = {
  open: boolean;
  label: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  disconnecting: boolean;
  error: string | null;
};

function DisconnectIntegrationDialog({
  open,
  label,
  onClose,
  onConfirm,
  disconnecting,
  error,
}: DisconnectIntegrationDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="fixed inset-0 z-50 m-0 h-full max-h-none w-full max-w-none border-0 bg-transparent p-0 backdrop:bg-black/70"
    >
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-xl">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-zinc-50">
                Desconectar integração
              </h2>
              <p className="mt-2 text-sm text-zinc-400">
                Tem certeza que deseja desconectar o {label} deste cliente? As
                credenciais salvas serão removidas e será necessário conectar
                novamente para usar esta integração.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={disconnecting}
              className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100 disabled:opacity-50"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {error && (
            <p className="mb-4 text-sm text-red-400" role="alert">
              {error}
            </p>
          )}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={disconnecting}
              className="inline-flex items-center justify-center rounded-full border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void onConfirm()}
              disabled={disconnecting}
              className="inline-flex items-center justify-center rounded-full border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-300 transition-colors hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {disconnecting ? "Desconectando..." : "Desconectar"}
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
}

type IntegrationDisconnectControlsProps = {
  clientId: string;
  provider:
    | typeof IntegrationProvider.GA4
    | typeof IntegrationProvider.GOOGLE_ADS
    | typeof IntegrationProvider.META_ADS
    | typeof IntegrationProvider.ACTIVECAMPAIGN;
  label: string;
  connected: boolean;
};

export function IntegrationDisconnectControls({
  clientId,
  provider,
  label,
  connected,
}: IntegrationDisconnectControlsProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  if (!connected) {
    return null;
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    setDialogError(null);

    try {
      const response = await fetch("/api/integrations/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, provider }),
      });

      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        message?: string;
      } | null;

      if (!response.ok) {
        throw new Error(
          payload?.error ?? "Não foi possível desconectar a integração.",
        );
      }

      setDialogOpen(false);
      setToast({
        type: "success",
        message: payload?.message ?? `${label} desconectado com sucesso.`,
      });
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível desconectar a integração.";
      setDialogError(message);
      setToast({ type: "error", message });
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <div className="contents">
      <button
        type="button"
        onClick={() => {
          setDialogError(null);
          setDialogOpen(true);
        }}
        disabled={disconnecting}
        className="inline-flex items-center justify-center rounded-full border border-red-500/30 px-4 py-2 text-sm font-medium text-red-300 transition-colors hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {disconnecting ? "Desconectando..." : "Desconectar"}
      </button>

      <DisconnectIntegrationDialog
        open={dialogOpen}
        label={label}
        onClose={() => {
          if (!disconnecting) setDialogOpen(false);
        }}
        onConfirm={handleDisconnect}
        disconnecting={disconnecting}
        error={dialogError}
      />

      {toast && (
        <p
          role="status"
          className={
            toast.type === "success"
              ? "w-full text-xs text-emerald-400"
              : "w-full text-xs text-red-400"
          }
        >
          {toast.message}
        </p>
      )}
    </div>
  );
}

/** @deprecated Use IntegrationDisconnectControls */
export const OAuthDisconnectControls = IntegrationDisconnectControls;
