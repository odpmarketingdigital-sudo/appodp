import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// No Next.js 16 o antigo `middleware` foi renomeado para `proxy` (runtime Node.js).
// Aqui fazemos apenas uma verificação OTIMISTA: checamos a presença do cookie de
// sessão do Auth.js, sem consultar o banco (recomendação oficial do Next.js).
// A verificação real de autenticação/autorização deve ocorrer nos Server
// Components / Server Actions usando `auth()`.

const PROTECTED_PREFIXES = ["/dashboard", "/admin"];

const SESSION_COOKIES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
];

export default function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  const hasSession = SESSION_COOKIES.some((name) => req.cookies.has(name));

  if (!hasSession) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  // Ignora API, assets estáticos e arquivos com extensão.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
