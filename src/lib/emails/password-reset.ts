/** URL base usada nos links de e-mail de produção. */
export const PRODUCTION_APP_URL = "https://app.odpdigital.com.br";

export const RESEND_FROM =
  process.env.RESEND_FROM ?? "ODP Digital <suporte@odpdigital.com.br>";

type PasswordResetEmailParams = {
  resetUrl: string;
};

/** Template HTML dark mode para o e-mail de redefinição de senha. */
export function buildPasswordResetEmailHtml({
  resetUrl,
}: PasswordResetEmailParams): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Redefinir senha — AppODP</title>
</head>
<body style="margin:0;padding:0;background-color:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#09090b;padding:48px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#18181b;border:1px solid #27272a;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:40px 32px 24px;text-align:center;">
              <p style="margin:0 0 8px;font-size:13px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#a78bfa;">AppODP</p>
              <h1 style="margin:0;font-size:24px;font-weight:600;line-height:1.3;color:#fafafa;">Redefinir sua senha</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 32px;">
              <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#a1a1aa;">
                Recebemos uma solicitação para redefinir a senha da sua conta. Clique no botão abaixo para escolher uma nova senha. O link expira em <strong style="color:#e4e4e7;">1 hora</strong>.
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom:24px;">
                    <a href="${resetUrl}" style="display:inline-block;background-color:#fafafa;color:#18181b;font-size:14px;font-weight:600;text-decoration:none;padding:14px 28px;border-radius:9999px;">
                      Redefinir senha
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 16px;font-size:13px;line-height:1.5;color:#71717a;">
                Se o botão não funcionar, copie e cole este link no navegador:
              </p>
              <p style="margin:0;font-size:12px;line-height:1.5;word-break:break-all;color:#a78bfa;">
                <a href="${resetUrl}" style="color:#a78bfa;text-decoration:underline;">${resetUrl}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px;border-top:1px solid #27272a;background-color:#09090b;">
              <p style="margin:0;font-size:12px;line-height:1.5;color:#52525b;text-align:center;">
                Se você não solicitou esta alteração, ignore este e-mail. Sua senha permanecerá a mesma.
              </p>
              <p style="margin:12px 0 0;font-size:12px;line-height:1.5;color:#52525b;text-align:center;">
                © ODP Digital · <a href="${PRODUCTION_APP_URL}" style="color:#71717a;text-decoration:none;">app.odpdigital.com.br</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildPasswordResetEmailText({
  resetUrl,
}: PasswordResetEmailParams): string {
  return `Redefinir sua senha — AppODP

Recebemos uma solicitação para redefinir a senha da sua conta.

Acesse o link abaixo para escolher uma nova senha (válido por 1 hora):
${resetUrl}

Se você não solicitou esta alteração, ignore este e-mail.

— ODP Digital
${PRODUCTION_APP_URL}`;
}
