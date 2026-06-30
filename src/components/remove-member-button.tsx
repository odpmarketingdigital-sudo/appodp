"use client";

import { useActionState } from "react";
import { Trash2 } from "lucide-react";

import { removeMemberAction, type TeamFormState } from "@/actions/team";

const initialState: TeamFormState = { status: "idle" };

export function RemoveMemberButton({ membershipId }: { membershipId: string }) {
  const [state, formAction, pending] = useActionState(
    removeMemberAction,
    initialState,
  );

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="membershipId" value={membershipId} />
      <button
        type="submit"
        disabled={pending}
        title="Remover membro"
        className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-2.5 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Trash2 className="h-3.5 w-3.5" aria-hidden />
        {pending ? "Removendo..." : "Remover"}
      </button>
      {state.status === "error" && state.message && (
        <span className="text-xs text-red-400">{state.message}</span>
      )}
    </form>
  );
}
