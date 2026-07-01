import { prisma } from "@/lib/prisma";

/** Verifica se o usuário autenticado é administrador global do sistema. */
export async function isSystemAdmin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isSystemAdmin: true },
  });
  return user?.isSystemAdmin ?? false;
}
