"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/auth";
import { getCurrentMembership } from "@/lib/company";
import { clientHasGoogleAdsToken } from "@/lib/client-google-ads";
import { listAccessibleGoogleAdsCustomers } from "@/lib/integrations/google-ads-api";
import { getValidGoogleAccessToken } from "@/lib/integrations/google-token";
import { prisma } from "@/lib/prisma";
import { IntegrationProvider } from "@/app/generated/prisma";

import type { GoogleAdsCustomerOption } from "@/types/google-ads";

export type GoogleAdsCustomerFormState = {
  status: "idle" | "success" | "error";
  message?: string;
  customers?: GoogleAdsCustomerOption[];
  fieldErrors?: { customerId?: string };
};

async function requireClientAccess(clientId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Sessão expirada." as const };
  }

  const membership = await getCurrentMembership(session.user.id);
  if (!membership) {
    return { error: "Nenhuma empresa associada." as const };
  }

  const client = await prisma.client.findFirst({
    where: { id: clientId, companyId: membership.company.id },
    select: { id: true },
  });

  if (!client) {
    return { error: "Cliente não encontrado." as const };
  }

  return { membership, clientId: client.id };
}

/** Lista contas Google Ads disponíveis para o cliente. */
export async function listGoogleAdsCustomersAction(
  clientId: string,
): Promise<GoogleAdsCustomerFormState> {
  const ctx = await requireClientAccess(clientId);
  if ("error" in ctx) {
    return { status: "error", message: ctx.error };
  }

  const hasToken = await clientHasGoogleAdsToken(
    ctx.clientId,
    ctx.membership.company.id,
  );
  if (!hasToken) {
    return {
      status: "error",
      message:
        "Nenhuma conta Google conectada com escopo Ads. Conecte o Google Ads abaixo.",
    };
  }

  const token = await prisma.integrationToken.findUnique({
    where: {
      clientId_provider: {
        clientId: ctx.clientId,
        provider: IntegrationProvider.GOOGLE_ADS,
      },
    },
    select: {
      accessToken: true,
      refreshToken: true,
      expiresAt: true,
      metadata: true,
    },
  });

  if (!token?.accessToken) {
    return {
      status: "error",
      message: "Token Google Ads não encontrado para este cliente.",
    };
  }

  const accessToken = await getValidGoogleAccessToken({
    accessToken: token.accessToken,
    refreshToken: token.refreshToken,
    expiresAt: token.expiresAt,
  });

  if (!accessToken) {
    return {
      status: "error",
      message: "Não foi possível validar o token do Google Ads.",
    };
  }

  const result = await listAccessibleGoogleAdsCustomers(accessToken);
  if (!result.ok) {
    return {
      status: "error",
      message: result.error,
      customers: [],
    };
  }

  return {
    status: "success",
    customers: result.customers,
  };
}

const saveCustomerSchema = z.object({
  clientId: z.string().min(1, "Cliente inválido."),
  customerId: z
    .string()
    .min(1, "Selecione uma conta de anúncios.")
    .regex(/^\d+$/, "ID da conta Google Ads inválido."),
  managerCustomerId: z
    .string()
    .regex(/^\d+$/, "ID da MCC inválido.")
    .optional()
    .or(z.literal("")),
});

/** Salva a conta Google Ads monitorada no token do cliente. */
export async function saveGoogleAdsCustomerAction(
  _prevState: GoogleAdsCustomerFormState,
  formData: FormData,
): Promise<GoogleAdsCustomerFormState> {
  const parsed = saveCustomerSchema.safeParse({
    clientId: formData.get("clientId"),
    customerId: formData.get("customerId"),
    managerCustomerId: formData.get("managerCustomerId") ?? "",
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Selecione uma conta Google Ads válida.",
      fieldErrors: { customerId: "Conta obrigatória." },
    };
  }

  const ctx = await requireClientAccess(parsed.data.clientId);
  if ("error" in ctx) {
    return { status: "error", message: ctx.error };
  }

  const hasToken = await clientHasGoogleAdsToken(
    ctx.clientId,
    ctx.membership.company.id,
  );
  if (!hasToken) {
    return {
      status: "error",
      message: "Conecte o Google Ads antes de selecionar a conta.",
    };
  }

  const resourceName = `customers/${parsed.data.customerId}`;

  const managerCustomerId = parsed.data.managerCustomerId || undefined;

  try {
    await prisma.integrationToken.update({
      where: {
        clientId_provider: {
          clientId: ctx.clientId,
          provider: IntegrationProvider.GOOGLE_ADS,
        },
      },
      data: {
        externalAccountId: parsed.data.customerId,
        metadata: {
          customerId: parsed.data.customerId,
          resourceName,
          ...(managerCustomerId ? { managerCustomerId } : {}),
        },
      },
    });
  } catch {
    return {
      status: "error",
      message: "Não foi possível salvar a conta. Tente novamente.",
    };
  }

  const base = `/dashboard/clients/${ctx.clientId}`;
  revalidatePath(base);
  revalidatePath(`${base}/integrations`);

  return {
    status: "success",
    message: "Conta Google Ads salva com sucesso!",
  };
}
