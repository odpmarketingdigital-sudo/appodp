-- =============================================================================
-- Integração Meta Ads — tabela por usuário (SaaS multi-cliente)
-- Execute no SQL Editor do Supabase (Dashboard → SQL → New query).
-- =============================================================================

-- Tabela principal
CREATE TABLE IF NOT EXISTS public.meta_integrations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  ad_account_id text,
  access_token  text NOT NULL,
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT meta_integrations_user_id_key UNIQUE (user_id)
);

-- Índice para buscas por usuário
CREATE INDEX IF NOT EXISTS meta_integrations_user_id_idx
  ON public.meta_integrations (user_id);

-- Atualiza updated_at automaticamente
CREATE OR REPLACE FUNCTION public.set_meta_integrations_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS meta_integrations_updated_at ON public.meta_integrations;

CREATE TRIGGER meta_integrations_updated_at
  BEFORE UPDATE ON public.meta_integrations
  FOR EACH ROW
  EXECUTE FUNCTION public.set_meta_integrations_updated_at();

-- ─────────────────────────────────────────────
-- Row Level Security (RLS)
-- ─────────────────────────────────────────────

ALTER TABLE public.meta_integrations ENABLE ROW LEVEL SECURITY;

-- Cada usuário só lê a própria integração
CREATE POLICY "meta_integrations_select_own"
  ON public.meta_integrations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Cada usuário só insere a própria integração
CREATE POLICY "meta_integrations_insert_own"
  ON public.meta_integrations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Cada usuário só atualiza a própria integração
CREATE POLICY "meta_integrations_update_own"
  ON public.meta_integrations
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Cada usuário só remove a própria integração
CREATE POLICY "meta_integrations_delete_own"
  ON public.meta_integrations
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- =============================================================================
-- Variante Auth.js / NextAuth (se o login ainda usa public.users com cuid/text):
--
--   user_id text NOT NULL UNIQUE REFERENCES public.users (id) ON DELETE CASCADE,
--
-- Remova as políticas acima e recrie com:
--   USING (user_id = auth.jwt() ->> 'sub')
-- ou desabilite RLS e use apenas SUPABASE_SERVICE_ROLE_KEY no servidor.
-- =============================================================================
