import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE_NAME, AUTH_COOKIE_VALUE } from "@/lib/auth";

function rotaPublica(pathname: string) {
  return pathname === "/login";
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const autenticado = request.cookies.get(AUTH_COOKIE_NAME)?.value === AUTH_COOKIE_VALUE;
  const estaNaRotaLogin = rotaPublica(pathname);

  if (!autenticado && !estaNaRotaLogin) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (autenticado && estaNaRotaLogin) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

