"use client";

import { useActionState } from "react";
import { UserPlus } from "lucide-react";

import { inviteMemberAction, type TeamFormState } from "@/actions/team";

const initialState: TeamFormState = { status: "idle" };

export function InviteMemberForm() {
  const [state, formAction, pending] = useActionState(
    inviteMemberAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex-1 space-y-1">
          <label
            htmlFor="invite-email"
            className="block text-xs font-medium text-zinc-300"
          >
            E-mail do membro
          </label>
          <input
            id="invite-email"
            name="email"
            type="email"
            required
            placeholder="pessoa@empresa.com"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-700"
          />
          {state.fieldErrors?.email && (
            <p className="text-xs text-red-400">{state.fieldErrors.email}</p>
          )}
        </div>

        <div className="space-y-1">
          <label
            htmlFor="invite-role"
            className="block text-xs font-medium text-zinc-300"
          >
            Função
          </label>
          <select
            id="invite-role"
            name="role"
            defaultValue="MEMBER"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-700 sm:w-40"
          >
            <option value="MEMBER">Membro</option>
            <option value="ADMIN">Administrador</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <UserPlus className="h-4 w-4" aria-hidden />
          {pending ? "Convidando..." : "Convidar membro"}
        </button>

        {state.status !== "idle" && state.message && (
          <span
            className={
              state.status === "success"
                ? "text-xs text-emerald-400"
                : "text-xs text-red-400"
            }
          >
            {state.message}
          </span>
        )}
      </div>
    </form>
  );
}
