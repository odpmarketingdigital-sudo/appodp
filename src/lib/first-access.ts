import { CompanyRole } from "@/app/generated/prisma";
import { prisma } from "@/lib/prisma";

type FirstAccessUser = {
  id: string;
  name?: string | null;
  email?: string | null;
};

function slugify(input: string): string {
  const slug = input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 40);

  return slug || "empresa";
}

async function generateUniqueSlug(base: string): Promise<string> {
  const root = slugify(base);

  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate =
      attempt === 0 ? root : `${root}-${Math.random().toString(36).slice(2, 7)}`;
    const exists = await prisma.company.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!exists) return candidate;
  }

  return `${root}-${Date.now().toString(36)}`;
}

/**
 * Garante que o usuário possua ao menos uma Company.
 * Executado a cada login (idempotente): se não houver vínculo, cria
 * automaticamente uma Company e um CompanyMember com role OWNER.
 */
export async function ensureUserHasCompany(user: FirstAccessUser): Promise<void> {
  const existingMembership = await prisma.companyMember.findFirst({
    where: { userId: user.id },
    select: { id: true },
  });

  if (existingMembership) return;

  const displayName =
    user.name?.trim() || user.email?.split("@")[0]?.trim() || "Minha";
  const slug = await generateUniqueSlug(displayName);

  await prisma.company.create({
    data: {
      name: `Empresa de ${displayName}`,
      slug,
      members: {
        create: {
          userId: user.id,
          role: CompanyRole.OWNER,
        },
      },
    },
  });
}
