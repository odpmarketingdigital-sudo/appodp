# Checklist de Produção — AppODP

Guia passo a passo para publicar o AppODP na Vercel com domínio de produção:

**`https://app.odpdigital.com.br/`**

---

## 1. Pré-requisitos

- [ ] Repositório conectado à Vercel (branch `main` ou equivalente).
- [ ] Banco PostgreSQL provisionado (Supabase) com migrations aplicadas.
- [ ] Contas/configurações nos painéis: **Google Cloud**, **Meta for Developers**, **Stripe**.
- [ ] Domínio `app.odpdigital.com.br` apontando para a Vercel (DNS configurado).

---

## 2. Deploy na Vercel

1. Importe o repositório ou faça push na branch de produção.
2. Framework detectado: **Next.js** (build: `next build`, output padrão).
3. Em **Settings → Environment Variables**, cadastre **todas** as variáveis da seção 3 (Production).
4. Em **Settings → Domains**, adicione `app.odpdigital.com.br`.
5. Execute o deploy e aguarde o build concluir sem erros.

---

## 3. Variáveis de ambiente (Vercel → Production)

Gere novos segredos para produção (`openssl rand -base64 32`). **Não reutilize** valores de desenvolvimento local.

### Banco de dados (Supabase / PostgreSQL)

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `DATABASE_URL` | Sim | Connection string do pooler em **modo transação** (porta `6543`, `?pgbouncer=true`). Usada em runtime pela aplicação. |
| `DIRECT_URL` | Sim | Connection string em **modo sessão** (porta `5432`). Usada pelo Prisma CLI para migrations (`prisma migrate deploy`). |

### Auth.js v5 (login com Google)

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `AUTH_SECRET` | Sim | Segredo para assinar cookies/tokens de sessão. |
| `AUTH_URL` | Sim | URL base da aplicação em produção: `https://app.odpdigital.com.br` |
| `AUTH_GOOGLE_ID` | Sim | Client ID do OAuth client de **login** (Google Cloud Console). |
| `AUTH_GOOGLE_SECRET` | Sim | Client Secret do OAuth client de **login**. |

**Redirect URI de login (Google Cloud Console):**

```
https://app.odpdigital.com.br/api/auth/callback/google
```

### Google OAuth — Integrações (GA4 / Google Ads)

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `GOOGLE_CLIENT_ID` | Sim | Client ID do OAuth client usado para **conectar integrações** (pode ser o mesmo app ou um client separado). |
| `GOOGLE_CLIENT_SECRET` | Sim | Client Secret correspondente. |

**Redirect URI de integração (Google Cloud Console):**

```
https://app.odpdigital.com.br/api/integrations/google/callback
```

### Meta OAuth — Integração (Meta Ads)

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `META_CLIENT_ID` | Sim | App ID do app no Meta for Developers. |
| `META_CLIENT_SECRET` | Sim | App Secret do app. |

**Redirect URI (Meta for Developers → Facebook Login → Settings):**

```
https://app.odpdigital.com.br/api/integrations/meta/callback
```

### Stripe — Monetização (Free vs Premium)

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `STRIPE_SECRET_KEY` | Sim | Chave secreta da API (`sk_live_...` em produção). |
| `STRIPE_WEBHOOK_SECRET` | Sim | Signing secret do endpoint de webhook (`whsec_...`). |
| `STRIPE_PREMIUM_PRICE_ID` | Sim | Price ID do plano Premium (`price_...`). |

**Endpoint de webhook (Stripe Dashboard → Developers → Webhooks):**

```
https://app.odpdigital.com.br/api/webhooks/stripe
```

Eventos mínimos a escutar:

- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`

### Cron — Sincronização em background

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `CRON_SECRET` | Sim | Segredo enviado no header `Authorization: Bearer <CRON_SECRET>` para proteger `/api/cron/sync`. |

O agendamento está definido em `vercel.json`:

- **Rota:** `/api/cron/sync`
- **Schedule:** `0 6 * * *` (diariamente às 06:00 UTC)

> A Vercel Cron injeta automaticamente o header de autorização quando `CRON_SECRET` está configurado no projeto.

---

## 4. URLs de produção — resumo rápido

| Serviço | URL a registrar no painel externo |
|---------|-------------------------------------|
| Google Login (Auth.js) | `https://app.odpdigital.com.br/api/auth/callback/google` |
| Google Integrações (GA4 / Ads) | `https://app.odpdigital.com.br/api/integrations/google/callback` |
| Meta Integrações (Meta Ads) | `https://app.odpdigital.com.br/api/integrations/meta/callback` |
| Stripe Webhook | `https://app.odpdigital.com.br/api/webhooks/stripe` |

---

## 5. Banco de dados — migrations

Antes ou logo após o primeiro deploy, aplique as migrations no banco de produção:

```bash
# Com DIRECT_URL apontando para o Supabase de produção
npx prisma migrate deploy
```

Confirme que as tabelas essenciais existem: `users`, `companies`, `company_members`, `clients`, `integration_tokens`, `marketing_metric_history`, `subscriptions`.

---

## 6. Checklist pós-deploy (smoke test)

- [ ] Acessar `https://app.odpdigital.com.br/` e fazer login com Google.
- [ ] Criar/editar agência em `/dashboard/settings` (como OWNER ou ADMIN).
- [ ] Criar cliente em `/dashboard/clients` (validar trava do plano gratuito).
- [ ] Conectar integração Google (GA4) e Meta Ads em um cliente.
- [ ] Convidar membro em `/dashboard/team` e validar que MEMBER não acessa faturamento.
- [ ] Testar upgrade Premium (`/api/checkout/premium` → Stripe Checkout).
- [ ] Confirmar webhook Stripe atualizando `subscriptions.status` para `active`.
- [ ] Verificar execução do cron em **Vercel → Logs** (após 06:00 UTC) ou chamar manualmente:

```bash
curl -H "Authorization: Bearer <CRON_SECRET>" \
  https://app.odpdigital.com.br/api/cron/sync
```

---

## 7. Validação local antes do deploy

Execute na raiz do projeto para garantir tipos, lint e geração de rotas:

```bash
npx tsc --noEmit
npm run lint
npm run build
```

O build deve listar, entre outras, as rotas:

- `/dashboard/team`
- `/dashboard/settings`
- `/api/webhooks/stripe`
- `/api/checkout/premium`
- `/api/cron/sync`
- `/api/integrations/google/auth` e `/callback`
- `/api/integrations/meta/auth` e `/callback`

---

## 8. Referência rápida — todas as variáveis

```
DATABASE_URL
DIRECT_URL
AUTH_SECRET
AUTH_URL
AUTH_GOOGLE_ID
AUTH_GOOGLE_SECRET
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
META_CLIENT_ID
META_CLIENT_SECRET
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PREMIUM_PRICE_ID
CRON_SECRET
```

**Total: 14 variáveis** (todas obrigatórias em produção).
