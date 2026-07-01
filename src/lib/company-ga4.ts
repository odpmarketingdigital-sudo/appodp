import { IntegrationProvider } from "@/app/generated/prisma";
import { prisma } from "@/lib/prisma";
import { getValidGoogleAccessToken } from "@/lib/integrations/google-token";

export type CompanyGa4Connection = {
  accessToken: string;
  propertyId: string | null;
  clientId: string;
  tokenId: string;
};

/** Token GA4 ativo e propriedade configurada para a agência. */
export async function getCompanyGa4Connection(
  companyId: string,
): Promise<CompanyGa4Connection | null> {
  const [company, token] = await Promise.all([
    prisma.company.findUnique({
      where: { id: companyId },
      select: { ga4PropertyId: true },
    }),
    prisma.integrationToken.findFirst({
      where: {
        isActive: true,
        provider: IntegrationProvider.GA4,
        client: { companyId },
      },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        clientId: true,
        accessToken: true,
        refreshToken: true,
        expiresAt: true,
        externalAccountId: true,
      },
    }),
  ]);

  if (!token?.accessToken) {
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
    company?.ga4PropertyId ??
    token.externalAccountId?.replace(/^properties\//, "") ??
    null;

  return {
    accessToken,
    propertyId,
    clientId: token.clientId,
    tokenId: token.id,
  };
}

/** Indica se a agência tem ao menos um token GA4 válido conectado. */
export async function companyHasGa4Token(companyId: string): Promise<boolean> {
  const connection = await getCompanyGa4Connection(companyId);
  return connection !== null;
}
