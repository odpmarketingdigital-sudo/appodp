-- CreateEnum
CREATE TYPE "IntegrationProvider" AS ENUM ('GA4', 'GOOGLE_ADS', 'META_ADS', 'RD_STATION', 'ACTIVECAMPAIGN');

-- CreateTable
CREATE TABLE "integration_tokens" (
    "id" TEXT NOT NULL,
    "provider" "IntegrationProvider" NOT NULL,
    "client_id" TEXT NOT NULL,
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT,
    "expires_at" TIMESTAMP(3),
    "scope" TEXT,
    "external_account_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "integration_tokens_client_id_idx" ON "integration_tokens"("client_id");

-- CreateIndex
CREATE UNIQUE INDEX "integration_tokens_client_id_provider_key" ON "integration_tokens"("client_id", "provider");

-- AddForeignKey
ALTER TABLE "integration_tokens" ADD CONSTRAINT "integration_tokens_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
