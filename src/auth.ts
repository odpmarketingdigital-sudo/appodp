import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { ensureUserHasCompany } from "@/lib/first-access";
import { prisma } from "@/lib/prisma";

const credentialsSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  // Credentials exige sessão JWT; OAuth continua persistindo User/Account no Prisma.
  session: { strategy: "jwt" },
  trustHost: true,
  providers: [
    // Lê automaticamente AUTH_GOOGLE_ID e AUTH_GOOGLE_SECRET do ambiente.
    // `allowDangerousEmailAccountLinking` permite que um usuário convidado
    // (pré-criado pelo e-mail) faça login com o Google e vincule a conta —
    // seguro aqui porque o Google entrega e-mails já verificados.
    Google({ allowDangerousEmailAccountLinking: true }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const email = parsed.data.email.toLowerCase();

        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            name: true,
            email: true,
            passwordHash: true,
          },
        });

        if (!user?.passwordHash) return null;

        const valid = await bcrypt.compare(
          parsed.data.password,
          user.passwordHash,
        );
        if (!valid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
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
