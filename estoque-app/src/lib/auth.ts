export const AUTH_COOKIE_NAME = "estoque_auth";
export const AUTH_COOKIE_VALUE = "ok";

const LOGIN_USUARIO = process.env.AUTH_USER ?? "";
const LOGIN_SENHA = process.env.AUTH_PASS ?? "";

export function credenciaisValidas(usuario: string, senha: string) {
  if (!LOGIN_USUARIO || !LOGIN_SENHA) return false;
  return usuario === LOGIN_USUARIO && senha === LOGIN_SENHA;
}
