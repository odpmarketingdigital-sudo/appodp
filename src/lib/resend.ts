import { Resend } from "resend";

import {
  buildPasswordResetEmailHtml,
  buildPasswordResetEmailText,
  RESEND_FROM,
} from "@/lib/emails/password-reset";

let resendClient: Resend | null = null;

/** Retorna o client Resend ou `null` se `RESEND_API_KEY` não estiver configurada. */
export function getResend(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;

  if (!resendClient) {
    resendClient = new Resend(apiKey);
  }

  return resendClient;
}

type SendPasswordResetEmailParams = {
  to: string;
  resetUrl: string;
};

/**
 * Envia o e-mail de redefinição de senha via Resend.
 * Retorna `{ ok: true }` ou `{ ok: false, error: string }` sem lançar exceção.
 */
export async function sendPasswordResetEmail({
  to,
  resetUrl,
}: SendPasswordResetEmailParams): Promise<{ ok: true } | { ok: false; error: string }> {
  const resend = getResend();
  if (!resend) {
    return { ok: false, error: "RESEND_API_KEY não configurada." };
  }

  try {
    const { error } = await resend.emails.send({
      from: RESEND_FROM,
      to,
      subject: "Redefinir sua senha — AppODP",
      html: buildPasswordResetEmailHtml({ resetUrl }),
      text: buildPasswordResetEmailText({ resetUrl }),
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido ao enviar e-mail.";
    return { ok: false, error: message };
  }
}
