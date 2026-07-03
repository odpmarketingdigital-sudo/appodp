import { IntegrationProvider } from "@/app/generated/prisma";
import { prisma } from "@/lib/prisma";

export type ClientActiveCampaignConnection = {
  apiToken: string;
  apiBaseUrl: string;
  clientId: string;
};

/** Token ActiveCampaign ativo e URL da conta para um cliente específico. */
export async function getClientActiveCampaignConnection(
  clientId: string,
  companyId: string,
): Promise<ClientActiveCampaignConnection | null> {
  const client = await prisma.client.findFirst({
    where: { id: clientId, companyId },
    select: {
      id: true,
      integrationTokens: {
        where: {
          provider: IntegrationProvider.ACTIVECAMPAIGN,
          isActive: true,
        },
        take: 1,
        select: {
          accessToken: true,
          externalAccountId: true,
        },
      },
    },
  });

  const token = client?.integrationTokens[0];
  if (!client || !token?.accessToken || !token.externalAccountId) {
    return null;
  }

  return {
    apiToken: token.accessToken,
    apiBaseUrl: token.externalAccountId,
    clientId: client.id,
  };
}
