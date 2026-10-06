import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const AUTH_COOKIE_NAME = "estoque_auth";

type AuthAccount = {
  username: string;
  password: string;
  tenantId: string;
  appName: string;
};

type SessionPayload = {
  u: string;
  exp: number;
};

export type AuthSession = {
  username: string;
  tenantId: string;
  appName: string;
};

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;

function normalizarTexto(valor: string) {
  return valor.trim().toLowerCase();
}

function normalizarTenant(valor: string) {
  return normalizarTexto(valor).replace(/[^a-z0-9_-]/g, "");
}

function criarConta(
  usernameRaw: string | undefined,
  passwordRaw: string | undefined,
  tenantRaw: string | undefined,
  appNameRaw: string | undefined,
) {
  const username = normalizarTexto(usernameRaw ?? "");
  const password = String(passwordRaw ?? "").trim();
  if (!username || !password) return null;

  const tenantId = normalizarTenant(tenantRaw ?? username);
  if (!tenantId) return null;

  return {
    username,
    password,
    tenantId,
    appName: String(appNameRaw ?? "").trim() || username,
  } as AuthAccount;
}

function getAuthAccounts() {
  const contas: AuthAccount[] = [];

  const conta1 = criarConta(
    process.env.AUTH_USER,
    process.env.AUTH_PASS,
    process.env.AUTH_TENANT_1,
    process.env.AUTH_APP_NAME_1,
  );
  if (conta1) contas.push(conta1);

  const conta2 = criarConta(
    process.env.AUTH_USER_2,
    process.env.AUTH_PASS_2,
    process.env.AUTH_TENANT_2,
    process.env.AUTH_APP_NAME_2,
  );
  if (conta2) contas.push(conta2);

  return contas;
}

function getSessionSecret() {
  return String(process.env.AUTH_SESSION_SECRET ?? "").trim();
}

function assinar(valor: string) {
  return createHmac("sha256", getSessionSecret()).update(valor).digest("base64url");
}

function gerarTokenSessao(username: string) {
  const segredo = getSessionSecret();
  if (!segredo) return "";

  const payload: SessionPayload = {
    u: normalizarTexto(username),
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const assinatura = assinar(payloadB64);
  return `${payloadB64}.${assinatura}`;
}

function compararAssinatura(recebida: string, esperada: string) {
  const buffRecebida = Buffer.from(recebida);
  const buffEsperada = Buffer.from(esperada);
  if (buffRecebida.length !== buffEsperada.length) return false;
  return timingSafeEqual(buffRecebida, buffEsperada);
}

function lerSessaoDoToken(token: string | undefined) {
  if (!token) return null;
  const segredo = getSessionSecret();
  if (!segredo) return null;

  const [payloadB64, assinatura] = token.split(".");
  if (!payloadB64 || !assinatura) return null;

  const assinaturaEsperada = assinar(payloadB64);
  if (!compararAssinatura(assinatura, assinaturaEsperada)) return null;

  let payload: SessionPayload;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8")) as SessionPayload;
  } catch {
    return null;
  }

  if (!payload?.u || !payload?.exp) return null;
  if (payload.exp < Math.floor(Date.now() / 1000)) return null;

  const conta = getAuthAccounts().find((item) => item.username === normalizarTexto(payload.u));
  if (!conta) return null;

  return {
    username: conta.username,
    tenantId: conta.tenantId,
    appName: conta.appName,
  } as AuthSession;
}

export function hasAuthConfig() {
  return getAuthAccounts().length > 0 && Boolean(getSessionSecret());
}

export function credenciaisValidas(usuario: string, senha: string) {
  const conta = getAuthAccounts().find(
    (item) => item.username === normalizarTexto(usuario) && item.password === String(senha ?? "").trim(),
  );
  return conta
    ? { username: conta.username, tenantId: conta.tenantId, appName: conta.appName }
    : null;
}

export function criarTokenParaUsuario(username: string) {
  return gerarTokenSessao(username);
}

export async function getOptionalSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  return lerSessaoDoToken(token);
}

export async function requireSession() {
  const sessao = await getOptionalSession();
  if (!sessao) {
    redirect("/login");
  }
  return sessao;
}

export function getSessionMaxAgeSeconds() {
  return SESSION_MAX_AGE_SECONDS;
}

