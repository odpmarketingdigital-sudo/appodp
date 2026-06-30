import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";

import { ensureUserHasCompany } from "@/lib/first-access";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  // Com OAuth + Prisma Adapter as sessões são persistidas na tabela `sessions`.
  session: { strategy: "database" },
  trustHost: true,
  providers: [
    // Lê automaticamente AUTH_GOOGLE_ID e AUTH_GOOGLE_SECRET do ambiente.
    // `allowDangerousEmailAccountLinking` permite que um usuário convidado
    // (pré-criado pelo e-mail) faça login com o Google e vincule a conta —
    // seguro aqui porque o Google entrega e-mails já verificados.
    Google({ allowDangerousEmailAccountLinking: true }),
  ],
  callbacks: {
    // Expõe o id do usuário na sessão para uso no app.
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
  events: {
    // Primeiro acesso: garante Company + CompanyMember (OWNER) para o usuário.
    // Uma falha aqui não deve interromper o login: apenas registramos o erro.
    async signIn({ user }) {
      if (!user?.id) return;

      try {
        await ensureUserHasCompany({
          id: user.id,
          name: user.name,
          email: user.email,
        });
      } catch (error) {
        console.error(
          `[auth] Falha ao garantir Company no primeiro acesso (userId: ${user.id}):`,
          error,
        );
      }
    },
  },
});
