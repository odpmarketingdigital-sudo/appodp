import { IntegrationProvider } from "@/app/generated/prisma";
import {
  BaseIntegration,
  type FetchReportParams,
  type IntegrationCredentials,
} from "@/lib/integrations/base";
import {
  buildSimulatedReport,
  type SimulationProfile,
} from "@/lib/integrations/simulator";
import type { IntegrationResult, MarketingReport } from "@/types/integrations";

/**
 * Perfil de tráfego típico do GA4: volume moderado, CTR de 3% a 6% e CPC
 * relativamente baixo. Menos acessos nos fins de semana.
 */
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
 *
 * O `fetchReport` gera uma série temporal diária fictícia, porém realista,
 * simulando a Data API do GA4. Os dados são determinísticos em função das
 * credenciais + data, então não mudam a cada coleta.
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

    // Semente estável por conta para manter a série consistente entre coletas.
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
