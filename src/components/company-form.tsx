"use client";

import { useActionState } from "react";

import {
  updateCompanyAction,
  type CompanyFormState,
} from "@/actions/company";

const initialState: CompanyFormState = { status: "idle" };

type CompanyFormProps = {
  company: {
    id: string;
    name: string;
    slug: string;
  };
};

export function CompanyForm({ company }: CompanyFormProps) {
  const [state, formAction, pending] = useActionState(
    updateCompanyAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="companyId" value={company.id} />

      {state.status !== "idle" && state.message && (
        <div
          role="status"
          className={
            state.status === "success"
              ? "rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-900/50 dark:bg-green-950/40 dark:text-green-300"
              : "rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
          }
        >
          {state.message}
        </div>
      )}

      <div className="space-y-1.5">
        <label
          htmlFor="name"
          className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Nome da empresa
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={company.name}
          aria-invalid={Boolean(state.fieldErrors?.name)}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-zinc-700"
        />
        {state.fieldErrors?.name && (
          <p className="text-xs text-red-600 dark:text-red-400">
            {state.fieldErrors.name}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="slug"
          className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Slug
        </label>
        <input
          id="slug"
          name="slug"
          type="text"
          required
          defaultValue={company.slug}
          aria-invalid={Boolean(state.fieldErrors?.slug)}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-zinc-700"
        />
        {state.fieldErrors?.slug ? (
          <p className="text-xs text-red-600 dark:text-red-400">
            {state.fieldErrors.slug}
          </p>
        ) : (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Identificador único usado em URLs (letras minúsculas, números e
            hífens).
          </p>
        )}
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {pending ? "Salvando..." : "Salvar alterações"}
        </button>
      </div>
    </form>
  );
}
