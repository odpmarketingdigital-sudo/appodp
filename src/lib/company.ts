import { prisma } from "@/lib/prisma";

/**
 * Retorna o vínculo (membership) atual do usuário com a empresa, incluindo
 * os dados da empresa. Por enquanto, a "empresa atual" é a primeira pela
 * ordem de criação (a gerada no primeiro acesso).
 */
export async function getCurrentMembership(userId: string) {
  return prisma.companyMember.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
    include: { company: true },
  });
}
