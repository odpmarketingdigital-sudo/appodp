import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  /**
   * Estende a sessão do Auth.js para incluir o id do usuário.
   * O papel (role) é por empresa (CompanyMember) e não fica na sessão global.
   */
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
  }
}
