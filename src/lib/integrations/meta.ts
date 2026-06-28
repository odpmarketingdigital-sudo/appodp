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
 * Perfil típico do Meta Ads (Facebook/Instagram): maior volume de impressões,
 * CTR um pouco menor e CPC ligeiramente mais alto que o GA4. O consumo em
 * redes sociais cai menos nos fins de semana. O `salt` próprio garante uma
 * série numericamente diferente da do GA4 para a mesma conta/data.
 */
const META_PROFILE: SimulationProfile = {
  salt: "meta_ads",
  impressions: { min: 2500, span: 3500 },
  ctr: { min: 0.012, span: 0.02 },
  cpc: { min: 1.1, span: 1.9 },
  conversionRate: { min: 0.015, span: 0.05 },
  averageOrderValue: { min: 90, span: 180 },
  weekendFactor: 0.85,
};

/**
 * Integração com o Meta Ads (Facebook/Instagram).
 *
 * Assim como o GA4, gera uma série diária fictícia, realista e determinística,
 * simulando a Marketing API da Meta enquanto a integração real não é plugada.
 */
export class MetaAdsIntegration extends BaseIntegration {
  readonly provider = IntegrationProvider.META_ADS;

  constructor(credentials: IntegrationCredentials) {
    super(credentials);
  }

  async verifyConnection(): Promise<IntegrationResult<true>> {
    if (!this.credentials.accessToken) {
      return {
        ok: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Access Token do Meta Ads ausente.",
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

    const seedBase =
      this.credentials.externalAccountId ??
      this.credentials.accessToken ??
      "meta_ads";

    return buildSimulatedReport(
      this.provider,
      params.range,
      seedBase,
      META_PROFILE,
    );
  }
}
