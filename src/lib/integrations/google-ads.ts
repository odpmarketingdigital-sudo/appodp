import { IntegrationProvider } from "@/app/generated/prisma";
import {
  BaseIntegration,
  type FetchReportParams,
  type IntegrationCredentials,
} from "@/lib/integrations/base";
import { fetchGoogleAdsMetrics } from "@/lib/integrations/google-ads-api";
import { getValidGoogleAccessToken } from "@/lib/integrations/google-token";
import type {
  IntegrationResult,
  MarketingReport,
  MetricsDataPoint,
} from "@/types/integrations";

function resolveManagerCustomerId(
  metadata: Record<string, unknown> | null | undefined,
): string | null {
  if (!metadata) return null;
  return typeof metadata.managerCustomerId === "string"
    ? metadata.managerCustomerId
    : null;
}

/**
 * Integração com o Google Ads.
 * Coleta métricas reais via GAQL e normaliza para `MarketingMetricHistory`.
 */
export class GoogleAdsIntegration extends BaseIntegration {
  readonly provider = IntegrationProvider.GOOGLE_ADS;

  constructor(credentials: IntegrationCredentials) {
    super(credentials);
  }

  async verifyConnection(): Promise<IntegrationResult<true>> {
    if (!this.credentials.accessToken) {
      return {
        ok: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Access Token do Google Ads ausente.",
          retryable: false,
        },
      };
    }

    if (!this.credentials.externalAccountId) {
      return {
        ok: false,
        error: {
          code: "INVALID_REQUEST",
          message:
            "Conta Google Ads não selecionada. Escolha a conta na página de integrações.",
          retryable: false,
        },
      };
    }

    return { ok: true, data: true };
  }

  async fetchReport(
    params: FetchReportParams,
  ): Promise<IntegrationResult<MarketingReport>> {
    const auth = await this.verifyConnection();
    if (!auth.ok) {
      return auth;
    }

    const accessToken = await getValidGoogleAccessToken({
      accessToken: this.credentials.accessToken,
      refreshToken: this.credentials.refreshToken,
      expiresAt: this.credentials.expiresAt,
    });

    if (!accessToken) {
      return {
        ok: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Não foi possível validar o token do Google Ads.",
          retryable: true,
        },
      };
    }

    const customerId = this.credentials.externalAccountId!.replace(/-/g, "");
    const managerCustomerId = resolveManagerCustomerId(this.credentials.metadata);

    const metricsResult = await fetchGoogleAdsMetrics(
      accessToken,
      customerId,
      params.range.start,
      params.range.end,
      managerCustomerId,
    );

    if (!metricsResult.ok) {
      return {
        ok: false,
        error: {
          code: "PROVIDER_ERROR",
          message: metricsResult.error,
          retryable: true,
        },
      };
    }

    const series: MetricsDataPoint[] = metricsResult.series.map((point) => ({
      date: point.date,
      impressions: Math.round(point.impressions),
      clicks: Math.round(point.clicks),
      cost: point.cost,
      conversions: Math.round(point.conversions),
      revenue: point.revenue,
    }));

    const totals = series.reduce(
      (acc, day) => ({
        impressions: acc.impressions + day.impressions,
        clicks: acc.clicks + day.clicks,
        cost: acc.cost + day.cost,
        conversions: acc.conversions + day.conversions,
        revenue: acc.revenue + day.revenue,
      }),
      { impressions: 0, clicks: 0, cost: 0, conversions: 0, revenue: 0 },
    );

    const ctr =
      totals.impressions > 0 ? totals.clicks / totals.impressions : 0;

    return {
      ok: true,
      data: {
        provider: this.provider,
        range: params.range,
        currency: metricsResult.currency,
        totals: {
          ...totals,
          ctr,
        },
        series,
        fetchedAt: new Date().toISOString(),
      },
    };
  }
}
