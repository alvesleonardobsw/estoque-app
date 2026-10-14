import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function hasSupabaseEnv() {
  return Boolean(supabaseUrl && supabaseServiceRoleKey);
}

const MENSAGEM_BANCO_FORA =
  "O banco de dados nao respondeu. Tente novamente em alguns instantes.";

// Quando o Supabase cai, o erro vem com a pagina HTML do Cloudflare (522/504)
// ou como falha de rede. Nesses casos mostra uma mensagem amigavel e deixa o
// erro completo so no log do servidor.
export function mensagemErro(
  ...erros: ({ message: string } | null | undefined)[]
): string {
  const erro = erros.find((e) => e);
  if (!erro) return "";

  const mensagem = erro.message ?? "";
  const indisponivel =
    /<!doctype|<html/i.test(mensagem) ||
    /fetch failed|FetchError|connection timed out|ECONNRESET|ETIMEDOUT/i.test(mensagem);

  if (indisponivel) {
    console.error("[supabase] banco indisponivel:", mensagem.slice(0, 500));
    return MENSAGEM_BANCO_FORA;
  }

  return mensagem;
}

export function getSupabaseClient() {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error(
      "Variaveis SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY nao configuradas.",
    );
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
