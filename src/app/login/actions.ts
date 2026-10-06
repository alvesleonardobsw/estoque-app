"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  AUTH_COOKIE_NAME,
  criarTokenParaUsuario,
  credenciaisValidas,
  getSessionMaxAgeSeconds,
  hasAuthConfig,
} from "@/lib/auth";

type LoginState = {
  ok: boolean;
  message: string;
};

export async function autenticar(_: LoginState, formData: FormData): Promise<LoginState> {
  if (!hasAuthConfig()) {
    return { ok: false, message: "Configure AUTH_USER, AUTH_PASS e AUTH_SESSION_SECRET no .env.local." };
  }

  const usuario = String(formData.get("usuario") ?? "").trim();
  const senha = String(formData.get("senha") ?? "").trim();
  const conta = credenciaisValidas(usuario, senha);

  if (!conta) {
    return { ok: false, message: "Login ou senha invalidos." };
  }

  const token = criarTokenParaUsuario(conta.username);
  if (!token) {
    return { ok: false, message: "Falha ao iniciar sessao. Verifique AUTH_SESSION_SECRET." };
  }

  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: getSessionMaxAgeSeconds(),
  });

  redirect("/");
}

export async function sair() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
  redirect("/login");
}
