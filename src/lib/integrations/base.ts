import type { IntegrationProvider } from "@/app/generated/prisma";
import type {
  DateRange,
  IntegrationResult,
  MarketingReport,
} from "@/types/integrations";

/** Credenciais necessárias para autenticar uma integração. */
export type IntegrationCredentials = {
  accessToken: string;
  refreshToken?: string | null;
  expiresAt?: Date | null;
  externalAccountId?: string | null;
  scope?: string | null;
  metadata?: Record<string, unknown> | null;
};

/** Parâmetros para a busca de um relatório. */
export type FetchReportParams = {
  range: DateRange;
};

/**
 * Contrato que toda integração de marketing deve seguir, garantindo uma
 * forma padronizada de buscar dados independentemente do provedor.
 *
 * Cada novo provedor (GA4, Google Ads, Meta Ads, etc.) deve implementar
 * esta interface — diretamente ou estendendo `BaseIntegration`.
 */
export interface MarketingIntegration {
  readonly provider: IntegrationProvider;

  /** Valida (e, se necessário, renova) a conexão com o provedor. */
  verifyConnection(): Promise<IntegrationResult<true>>;

  /** Busca um relatório de métricas normalizado para o período informado. */
  fetchReport(
    params: FetchReportParams,
  ): Promise<IntegrationResult<MarketingReport>>;
}

/**
 * Classe base abstrata para integrações. Centraliza o armazenamento das
 * credenciais e obriga as subclasses a implementarem o contrato comum.
 */
export abstract class BaseIntegration implements MarketingIntegration {
  abstract readonly provider: IntegrationProvider;

  protected constructor(
    protected readonly credentials: IntegrationCredentials,
  ) {}

  abstract verifyConnection(): Promise<IntegrationResult<true>>;

  abstract fetchReport(
    params: FetchReportParams,
  ): Promise<IntegrationResult<MarketingReport>>;
}
