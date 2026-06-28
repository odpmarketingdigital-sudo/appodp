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
 * Perfil de funil Inbound típico do RD Station. As métricas base são
 * reaproveitadas semanticamente:
 *   - impressions → Visitas (alto volume)
 *   - clicks      → Leads (conversão de 5% a 15% das visitas)
 *   - conversions → Oportunidades (2% a 5% dos leads)
 *   - revenue     → Vendas (oportunidades × ticket médio em BRL)
 * O `salt` próprio garante uma série distinta dos demais provedores.
 */
const RD_STATION_PROFILE: SimulationProfile = {
  salt: "rd_station",
  impressions: { min: 4000, span: 6000 },
  ctr: { min: 0.05, span: 0.1 },
  cpc: { min: 1.5, span: 3.5 },
  conversionRate: { min: 0.02, span: 0.03 },
  averageOrderValue: { min: 300, span: 1700 },
  weekendFactor: 0.7,
};

/**
 * Integração com o RD Station (Inbound/Leads).
 *
 * Gera uma série diária fictícia, realista e determinística, simulando o
 * comportamento do funil de marketing enquanto a API real não é plugada.
 */
export class RDStationIntegration extends BaseIntegration {
  readonly provider = IntegrationProvider.RD_STATION;

  constructor(credentials: IntegrationCredentials) {
    super(credentials);
  }

  async verifyConnection(): Promise<IntegrationResult<true>> {
    if (!this.credentials.accessToken) {
      return {
        ok: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Access Token do RD Station ausente.",
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
      "rd_station";

    return buildSimulatedReport(
      this.provider,
      params.range,
      seedBase,
      RD_STATION_PROFILE,
    );
  }
}
