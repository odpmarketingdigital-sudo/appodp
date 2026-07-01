import { IntegrationProvider } from "@/app/generated/prisma";
import {
  BaseIntegration,
  type FetchReportParams,
  type IntegrationCredentials,
} from "@/lib/integrations/base";
import { fetchGa4DashboardReport } from "@/lib/integrations/ga4-api";
import { getValidGoogleAccessToken } from "@/lib/integrations/google-token";
import {
  buildSimulatedReport,
  type SimulationProfile,
} from "@/lib/integrations/simulator";
import type { IntegrationResult, MarketingReport } from "@/types/integrations";

const GA4_PROFILE: SimulationProfile = {
  salt: "ga4",
  impressions: { min: 1200, span: 1800 },
  ctr: { min: 0.03, span: 0.03 },
  cpc: { min: 0.8, span: 1.7 },
  conversionRate: { min: 0.02, span: 0.06 },
  averageOrderValue: { min: 80, span: 170 },
  weekendFactor: 0.65,
};

/**
 * Integração com o Google Analytics 4.
 * Usa a Data API real quando há token e propertyId; caso contrário, simula.
 */
export class GA4Integration extends BaseIntegration {
  readonly provider = IntegrationProvider.GA4;

  constructor(credentials: IntegrationCredentials) {
    super(credentials);
  }

  async verifyConnection(): Promise<IntegrationResult<true>> {
    if (!this.credentials.accessToken) {
      return {
        ok: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Access Token do GA4 ausente.",
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

    const propertyId = this.credentials.externalAccountId?.replace(
      /^properties\//,
      "",
    );

    if (propertyId) {
      const accessToken = await getValidGoogleAccessToken({
        accessToken: this.credentials.accessToken,
        refreshToken: this.credentials.refreshToken,
        expiresAt: this.credentials.expiresAt,
      });

      if (accessToken) {
        try {
          const dashboard = await fetchGa4DashboardReport(
            accessToken,
            propertyId,
            params.range,
          );

          const series = dashboard.timeline.map((point) => ({
            date: point.date,
            impressions: point.activeUsers,
            clicks: point.engagedSessions,
            cost: 0,
            conversions: point.eventCount,
            revenue: 0,
          }));

          const totals = series.reduce(
            (acc, day) => ({
              impressions: acc.impressions + day.impressions,
              clicks: acc.clicks + day.clicks,
              cost: 0,
              conversions: acc.conversions + day.conversions,
              revenue: 0,
            }),
            { impressions: 0, clicks: 0, cost: 0, conversions: 0, revenue: 0 },
          );

          return {
            ok: true,
            data: {
              provider: this.provider,
              range: params.range,
              currency: "BRL",
              totals,
              series,
              fetchedAt: dashboard.fetchedAt,
            },
          };
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Erro na API do GA4.";
          return {
            ok: false,
            error: {
              code: "PROVIDER_ERROR",
              message,
              retryable: true,
            },
          };
        }
      }
    }

    const seedBase =
      this.credentials.externalAccountId ??
      this.credentials.accessToken ??
      "ga4";

    return buildSimulatedReport(
      this.provider,
      params.range,
      seedBase,
      GA4_PROFILE,
    );
  }
}
