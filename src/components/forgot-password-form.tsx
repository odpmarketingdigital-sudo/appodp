"use client";

import { useActionState } from "react";
import Link from "next/link";

import {
  requestPasswordResetAction,
  type PasswordResetFormState,
} from "@/actions/password-reset";

const initialState: PasswordResetFormState = { status: "idle" };

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(
    requestPasswordResetAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      {state.status === "error" && state.message && (
        <div
          role="alert"
          className="rounded-lg border border-red-900/50 bg-red-950/40 px-4 py-3 text-sm text-red-300"
        >
          {state.message}
        </div>
      )}

      {state.status === "success" && state.message && (
        <div
          role="status"
          className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300"
        >
          <p>{state.message}</p>
          {state.devResetUrl && (
            <p className="mt-2 break-all text-xs text-emerald-200/80">
              Dev:{" "}
              <a href={state.devResetUrl} className="underline">
                {state.devResetUrl}
              </a>
            </p>
          )}
        </div>
      )}

      {state.status !== "success" && (
        <>
          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="block text-sm font-medium text-zinc-300"
            >
              E-mail
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-700"
            />
            {state.fieldErrors?.email && (
              <p className="text-xs text-red-400">{state.fieldErrors.email}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-full bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Enviando..." : "Enviar link de redefinição"}
          </button>
        </>
      )}

      <p className="text-center text-sm text-zinc-500">
        <Link
          href="/login"
          className="font-medium text-zinc-200 underline underline-offset-2 hover:text-white"
        >
          Voltar ao login
        </Link>
      </p>
    </form>
  );
}
