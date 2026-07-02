import { IntegrationProvider } from "@/app/generated/prisma";
import { prisma } from "@/lib/prisma";
import { getValidGoogleAccessToken } from "@/lib/integrations/google-token";

export type ClientGa4Connection = {
  accessToken: string;
  propertyId: string | null;
  clientId: string;
  tokenId: string;
};

/** Token GA4 ativo e propriedade configurada para um cliente específico. */
export async function getClientGa4Connection(
  clientId: string,
  companyId: string,
): Promise<ClientGa4Connection | null> {
  const client = await prisma.client.findFirst({
    where: { id: clientId, companyId },
    select: {
      id: true,
      ga4PropertyId: true,
      integrationTokens: {
        where: { provider: IntegrationProvider.GA4, isActive: true },
        take: 1,
        select: {
          id: true,
          accessToken: true,
          refreshToken: true,
          expiresAt: true,
          externalAccountId: true,
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

  const propertyId =
    client.ga4PropertyId ??
    token.externalAccountId?.replace(/^properties\//, "") ??
    null;

  return {
    accessToken,
    propertyId,
    clientId: client.id,
    tokenId: token.id,
  };
}

/** Indica se o cliente possui token GA4 ativo. */
export async function clientHasGa4Token(
  clientId: string,
  companyId: string,
): Promise<boolean> {
  const connection = await getClientGa4Connection(clientId, companyId);
  return connection !== null;
}
