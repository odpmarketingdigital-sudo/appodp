import { runGlobalSync } from "@/lib/integrations/sync-engine";

// Sempre executa em tempo de requisição (nunca prerenderizado/cacheado).
export const dynamic = "force-dynamic";

/**
 * Verifica o cabeçalho `Authorization: Bearer <CRON_SECRET>`.
 * Compatível com o agendador de Cron da Vercel, que envia esse header.
 */
function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return false;
  }
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

async function handle(request: Request): Promise<Response> {
  if (!process.env.CRON_SECRET) {
    return Response.json(
      { error: "CRON_SECRET não configurado no ambiente." },
      { status: 500 },
    );
  }

  if (!isAuthorized(request)) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  const report = await runGlobalSync();

  return Response.json(
    {
      ok: report.failed === 0,
      ...report,
    },
    { status: 200 },
  );
}

export async function GET(request: Request): Promise<Response> {
  return handle(request);
}

export async function POST(request: Request): Promise<Response> {
  return handle(request);
}
