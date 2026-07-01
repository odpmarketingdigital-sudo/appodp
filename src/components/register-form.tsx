"use client";

import { useActionState } from "react";
import Link from "next/link";

import {
  registerUserAction,
  type RegisterFormState,
} from "@/actions/register";

const initialState: RegisterFormState = { status: "idle" };

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(
    registerUserAction,
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

      <div className="space-y-1.5">
        <label
          htmlFor="name"
          className="block text-sm font-medium text-zinc-300"
        >
          Nome
        </label>
        <input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          required
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-700"
        />
        {state.fieldErrors?.name && (
          <p className="text-xs text-red-400">{state.fieldErrors.name}</p>
        )}
      </div>

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
        <label
          htmlFor="password"
          className="block text-sm font-medium text-zinc-300"
        >
          Senha
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-700"
        />
        <p className="text-xs text-zinc-500">Mínimo de 8 caracteres.</p>
        {state.fieldErrors?.password && (
          <p className="text-xs text-red-400">{state.fieldErrors.password}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Criando conta..." : "Criar conta"}
      </button>

      <p className="text-center text-sm text-zinc-500">
        Já tem conta?{" "}
        <Link
          href="/login"
          className="font-medium text-zinc-200 underline underline-offset-2 hover:text-white"
        >
          Fazer login
        </Link>
      </p>
    </form>
  );
}
