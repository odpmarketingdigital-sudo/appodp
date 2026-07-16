import { IntegrationProvider } from "@/app/generated/prisma";
import { prisma } from "@/lib/prisma";
import { getValidGoogleAccessToken } from "@/lib/integrations/google-token";

export type ClientGoogleAdsConnection = {
  accessToken: string;
  customerId: string | null;
  clientId: string;
  tokenId: string;
};

/** Token Google Ads ativo e conta configurada para um cliente. */
export async function getClientGoogleAdsConnection(
  clientId: string,
  companyId: string,
): Promise<ClientGoogleAdsConnection | null> {
  const client = await prisma.client.findFirst({
    where: { id: clientId, companyId },
    select: {
      id: true,
      integrationTokens: {
        where: { provider: IntegrationProvider.GOOGLE_ADS, isActive: true },
        take: 1,
        select: {
          id: true,
          accessToken: true,
          refreshToken: true,
          expiresAt: true,
          externalAccountId: true,
          metadata: true,
        },
      },
    },
  });

  const token = client?.integrationTokens[0];
  if (!client || !token?.accessToken) {
    return null;
  }

  const accessToken = await getValidGoogleAccessToken({
    accessToken: token.accessToken,
    refreshToken: token.refreshToken,
    expiresAt: token.expiresAt,
  });

  if (!accessToken) {
    return null;
  }

  const metadata =
    token.metadata &&
    typeof token.metadata === "object" &&
    !Array.isArray(token.metadata)
      ? (token.metadata as Record<string, unknown>)
      : null;

  const customerId =
    token.externalAccountId ??
    (typeof metadata?.customerId === "string" ? metadata.customerId : null);

  return {
    accessToken,
    customerId,
    clientId: client.id,
    tokenId: token.id,
  };
}

/** Indica se o cliente possui token Google Ads ativo. */
export async function clientHasGoogleAdsToken(
  clientId: string,
  companyId: string,
): Promise<boolean> {
  const connection = await getClientGoogleAdsConnection(clientId, companyId);
  return connection !== null;
}
