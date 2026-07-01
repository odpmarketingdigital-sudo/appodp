"use client";

import { useActionState } from "react";
import Link from "next/link";

import {
  loginWithCredentialsAction,
  type AuthFormState,
} from "@/app/actions/auth";
import { LoginButton } from "@/components/login-button";

const initialState: AuthFormState = { status: "idle" };

export function CredentialsLoginForm() {
  const [state, formAction, pending] = useActionState(
    loginWithCredentialsAction,
    initialState,
  );

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-4">
        {state.status === "error" && state.message && (
          <div
            role="alert"
            className="rounded-lg border border-red-900/50 bg-red-950/40 px-4 py-3 text-sm text-red-300"
          >
            {state.message}
          </div>
        )}

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

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-zinc-300"
            >
              Senha
            </label>
            <Link
              href="/forgot-password"
              className="text-xs text-zinc-400 underline underline-offset-2 hover:text-zinc-200"
            >
              Esqueceu a senha?
            </Link>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-700"
          />
          {state.fieldErrors?.password && (
            <p className="text-xs text-red-400">{state.fieldErrors.password}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-full bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Entrando..." : "Entrar"}
        </button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-zinc-800" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-zinc-950 px-2 text-zinc-500">ou</span>
        </div>
      </div>

      <div className="flex justify-center">
        <LoginButton />
      </div>

      <p className="text-center text-sm text-zinc-500">
        Não tem conta?{" "}
        <Link
          href="/register"
          className="font-medium text-zinc-200 underline underline-offset-2 hover:text-white"
        >
          Criar conta
        </Link>
      </p>
    </div>
  );
}
