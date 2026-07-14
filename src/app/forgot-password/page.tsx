import { ForgotPasswordForm } from "@/components/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-zinc-950 px-4 py-6 sm:px-6">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-zinc-950 p-6 shadow-sm sm:p-8">
        <header className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
            Esqueceu a senha?
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Informe seu e-mail e enviaremos um link para redefinir sua senha.
          </p>
        </header>

        <ForgotPasswordForm />
      </div>
    </main>
  );
}
