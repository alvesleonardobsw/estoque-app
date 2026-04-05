"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE_NAME, AUTH_COOKIE_VALUE, credenciaisValidas } from "@/lib/auth";

type LoginState = {
  ok: boolean;
  message: string;
};

export async function autenticar(_: LoginState, formData: FormData): Promise<LoginState> {
  const usuario = String(formData.get("usuario") ?? "").trim();
  const senha = String(formData.get("senha") ?? "").trim();

  if (!credenciaisValidas(usuario, senha)) {
    return { ok: false, message: "Login ou senha invalidos." };
  }

  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, AUTH_COOKIE_VALUE, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });

  redirect("/");
}

export async function sair() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
  redirect("/login");
}

