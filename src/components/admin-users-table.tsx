"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Pencil, X } from "lucide-react";

import {
  updateUserAdminAction,
  type AdminUserFormState,
} from "@/actions/admin";
import {
  ADMIN_PLAN_OPTIONS,
  getPlanByPriceId,
  planSelectValue,
  subscriptionStatusLabel,
} from "@/lib/plans";

export type AdminUserRow = {
  id: string;
  name: string | null;
  email: string | null;
  isSystemAdmin: boolean;
  createdAt: string;
  companyId: string | null;
  companyName: string | null;
  subscriptionStatus: string;
  stripePriceId: string | null;
};

const initialFormState: AdminUserFormState = { status: "idle" };

function stripeBadgeClass(status: string): string {
  switch (status) {
    case "active":
    case "trialing":
      return "border-violet-500/30 bg-violet-500/10 text-violet-300";
    case "past_due":
      return "border-amber-500/30 bg-amber-500/10 text-amber-300";
    case "canceled":
      return "border-red-500/30 bg-red-500/10 text-red-300";
    default:
      return "border-zinc-700 bg-zinc-800/60 text-zinc-300";
  }
}

function EditUserModal({
  user,
  onClose,
}: {
  user: AdminUserRow;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [state, formAction, pending] = useActionState(
    updateUserAdminAction,
    initialFormState,
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
  }, []);

  useEffect(() => {
    if (state.status === "success") {
      const timer = setTimeout(onClose, 1200);
      return () => clearTimeout(timer);
    }
  }, [state.status, onClose]);

  const canEdit = Boolean(user.companyId);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="fixed inset-0 z-50 m-0 h-full max-h-none w-full max-w-none border-0 bg-transparent p-0 backdrop:bg-black/70"
    >
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-xl">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-zinc-50">
                Editar usuário
              </h2>
              <p className="mt-1 text-sm text-zinc-400">
                {user.name ?? user.email ?? "Sem nome"}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {!canEdit ? (
            <p className="text-sm text-zinc-400">
              Este usuário não possui agência vinculada para edição.
            </p>
          ) : (
            <form action={formAction} className="space-y-4">
              <input type="hidden" name="userId" value={user.id} />
              <input type="hidden" name="companyId" value={user.companyId!} />

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
                  {state.message}
                </div>
              )}

              <div className="space-y-1.5">
                <label
                  htmlFor="edit-email"
                  className="block text-xs font-medium text-zinc-300"
                >
                  E-mail
                </label>
                <input
                  id="edit-email"
                  name="email"
                  type="email"
                  required
                  defaultValue={user.email ?? ""}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-700"
                />
                {state.fieldErrors?.email && (
                  <p className="text-xs text-red-400">
                    {state.fieldErrors.email}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="edit-company"
                  className="block text-xs font-medium text-zinc-300"
                >
                  Nome da agência
                </label>
                <input
                  id="edit-company"
                  name="companyName"
                  type="text"
                  required
                  defaultValue={user.companyName ?? ""}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-700"
                />
                {state.fieldErrors?.companyName && (
                  <p className="text-xs text-red-400">
                    {state.fieldErrors.companyName}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="edit-plan"
                  className="block text-xs font-medium text-zinc-300"
                >
                  Plano
                </label>
                <select
                  id="edit-plan"
                  name="stripePriceId"
                  defaultValue={planSelectValue(
                    user.subscriptionStatus,
                    user.stripePriceId,
                  )}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-700"
                >
                  {ADMIN_PLAN_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {state.fieldErrors?.stripePriceId && (
                  <p className="text-xs text-red-400">
                    {state.fieldErrors.stripePriceId}
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={pending || state.status === "success"}
                  className="rounded-full bg-white px-4 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {pending
                    ? "Salvando..."
                    : state.status === "success"
                      ? "Atualizado com sucesso!"
                      : "Salvar alterações"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </dialog>
  );
}

export function AdminUsersTable({ users }: { users: AdminUserRow[] }) {
  const [editingUser, setEditingUser] = useState<AdminUserRow | null>(null);

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/40 text-xs uppercase tracking-wide text-zinc-500">
              <th className="px-5 py-3 font-medium">Nome</th>
              <th className="px-5 py-3 font-medium">E-mail</th>
              <th className="px-5 py-3 font-medium">Agência</th>
              <th className="px-5 py-3 font-medium">Stripe</th>
              <th className="px-5 py-3 font-medium">Cadastro</th>
              <th className="px-5 py-3 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {users.map((user) => {
              const planName = getPlanByPriceId(user.stripePriceId)?.name;

              return (
                <tr key={user.id} className="hover:bg-zinc-900/30">
                  <td className="px-5 py-3 text-zinc-100">
                    {user.name ?? "—"}
                    {user.isSystemAdmin && (
                      <span className="ml-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-medium text-violet-300">
                        Admin
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-zinc-400">
                    {user.email ?? "—"}
                  </td>
                  <td className="px-5 py-3 text-zinc-300">
                    {user.companyName ?? "Sem agência"}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${stripeBadgeClass(user.subscriptionStatus)}`}
                    >
                      {planName
                        ? `${planName} (${subscriptionStatusLabel(user.subscriptionStatus)})`
                        : subscriptionStatusLabel(user.subscriptionStatus)}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-zinc-400">
                    {new Date(user.createdAt).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-5 py-3">
                    <button
                      type="button"
                      onClick={() => setEditingUser(user)}
                      disabled={!user.companyId}
                      title={
                        user.companyId
                          ? "Editar usuário"
                          : "Sem agência vinculada"
                      }
                      className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-2.5 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-500 hover:bg-zinc-800 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden />
                      Editar
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editingUser && (
        <EditUserModal
          key={editingUser.id}
          user={editingUser}
          onClose={() => setEditingUser(null)}
        />
      )}
    </>
  );
}
