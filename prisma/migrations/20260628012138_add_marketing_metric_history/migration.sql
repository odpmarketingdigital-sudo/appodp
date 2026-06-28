-- CreateTable
CREATE TABLE "marketing_metric_history" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "provider" "IntegrationProvider" NOT NULL,
    "date" DATE NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "revenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketing_metric_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "marketing_metric_history_client_id_provider_idx" ON "marketing_metric_history"("client_id", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "marketing_metric_history_client_id_provider_date_key" ON "marketing_metric_history"("client_id", "provider", "date");

-- AddForeignKey
ALTER TABLE "marketing_metric_history" ADD CONSTRAINT "marketing_metric_history_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
