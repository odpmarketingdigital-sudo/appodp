import { IntegrationProvider } from "@/app/generated/prisma";
import {
  BaseIntegration,
  type FetchReportParams,
  type IntegrationCredentials,
  type MarketingIntegration,
} from "@/lib/integrations/base";
import { GA4Integration } from "@/lib/integrations/ga4";
import { GoogleAdsIntegration } from "@/lib/integrations/google-ads";
import { MetaAdsIntegration } from "@/lib/integrations/meta";
import { RDStationIntegration } from "@/lib/integrations/rdstation";
import type {
  IntegrationResult,
  MarketingReport,
} from "@/types/integrations";

/**
 * Esboço temporário para provedores ainda não implementados.
 * Mantém o contrato (`MarketingIntegration`) retornando um resultado de
 * erro descritivo, sem lançar exceções — pronto para ser substituído pela
 * implementação real de cada provedor.
 */
abstract class UnimplementedIntegration extends BaseIntegration {
  constructor(credentials: IntegrationCredentials) {
    super(credentials);
  }

  async verifyConnection(): Promise<IntegrationResult<true>> {
    return this.notImplemented<true>();
  }

  async fetchReport(
    _params: FetchReportParams,
  ): Promise<IntegrationResult<MarketingReport>> {
    return this.notImplemented<MarketingReport>();
  }

  private notImplemented<T>(): IntegrationResult<T> {
    return {
      ok: false,
      error: {
        code: "PROVIDER_ERROR",
        message: `Integração "${this.provider}" ainda não implementada.`,
        retryable: false,
      },
    };
  }
}

class ActiveCampaignIntegration extends UnimplementedIntegration {
  readonly provider = IntegrationProvider.ACTIVECAMPAIGN;
}

function assertNever(value: never): never {
  throw new Error(`Provedor de integração não suportado: ${String(value)}`);
}

/**
 * Resolve a implementação de integração correspondente ao provedor.
 * O `switch` exaustivo garante, em tempo de compilação, que todo novo
 * provedor adicionado ao enum tenha um caso correspondente aqui.
 */
export class IntegrationFactory {
  static getProvider(
    provider: IntegrationProvider,
    credentials: IntegrationCredentials,
  ): MarketingIntegration {
    switch (provider) {
      case IntegrationProvider.GA4:
        return new GA4Integration(credentials);
      case IntegrationProvider.GOOGLE_ADS:
        return new GoogleAdsIntegration(credentials);
      case IntegrationProvider.META_ADS:
        return new MetaAdsIntegration(credentials);
      case IntegrationProvider.RD_STATION:
        return new RDStationIntegration(credentials);
      case IntegrationProvider.ACTIVECAMPAIGN:
        return new ActiveCampaignIntegration(credentials);
      default:
        return assertNever(provider);
    }
  }
}
