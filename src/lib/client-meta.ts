import { IntegrationProvider } from "@/app/generated/prisma";
import { prisma } from "@/lib/prisma";

export type ClientMetaConnection = {
  accessToken: string;
  adAccountId: string | null;
  clientId: string;
  tokenId: string;
};

/** Token Meta Ads ativo e conta de anúncios configurada para um cliente. */
export async function getClientMetaConnection(
  clientId: string,
  companyId: string,
): Promise<ClientMetaConnection | null> {
  const client = await prisma.client.findFirst({
    where: { id: clientId, companyId },
    select: {
      id: true,
      integrationTokens: {
        where: { provider: IntegrationProvider.META_ADS, isActive: true },
        take: 1,
        select: {
          id: true,
          accessToken: true,
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

  const metadata =
    token.metadata &&
    typeof token.metadata === "object" &&
    !Array.isArray(token.metadata)
      ? (token.metadata as Record<string, unknown>)
      : null;

  const adAccountId =
    token.externalAccountId ??
    (typeof metadata?.adAccountId === "string" ? metadata.adAccountId : null);

  return {
    accessToken: token.accessToken,
    adAccountId,
    clientId: client.id,
    tokenId: token.id,
  };
}

/** Indica se o cliente possui token Meta Ads ativo. */
export async function clientHasMetaToken(
  clientId: string,
  companyId: string,
): Promise<boolean> {
  const connection = await getClientMetaConnection(clientId, companyId);
  return connection !== null;
}
