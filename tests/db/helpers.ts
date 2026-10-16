import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const PROJETO_DEV = "ydjukidzicerxjhlrutk";

// Todo dado criado pelos testes fica num tenant com este prefixo e e apagado ao final.
export const PREFIXO_TENANT = "vitest-";

// Tabelas na ordem em que podem ser apagadas (movimentos referenciam produtos sem cascade).
const TABELAS_DO_TENANT = ["estoque_movimentos", "pedido_itens", "pedidos", "produtos", "clientes"];

export function urlDoBancoDev() {
  const url = process.env.SUPABASE_URL ?? "";
  if (URL.parse(url)?.hostname !== `${PROJETO_DEV}.supabase.co`) {
    throw new Error(
      `Os testes de banco so rodam no Supabase dev (${PROJETO_DEV}). Confira SUPABASE_URL no .env.local.`,
    );
  }
  return url;
}

const opcoes = { auth: { persistSession: false, autoRefreshToken: false } };

export function bancoServico() {
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!chave) throw new Error("Defina SUPABASE_SERVICE_ROLE_KEY no .env.local.");
  return createClient(urlDoBancoDev(), chave, opcoes);
}

export function bancoAnon() {
  const chave = process.env.SUPABASE_ANON_KEY;
  if (!chave) {
    throw new Error(
      "Defina SUPABASE_ANON_KEY no .env.local com a chave publishable do projeto dev (Supabase > Project Settings > API Keys).",
    );
  }
  return createClient(urlDoBancoDev(), chave, opcoes);
}

export function novoTenant() {
  return `${PREFIXO_TENANT}${crypto.randomUUID()}`;
}

export async function apagarTenant(db: SupabaseClient, tenant: string) {
  for (const tabela of TABELAS_DO_TENANT) {
    const { error } = await db.from(tabela).delete().eq("tenant_id", tenant);
    if (error) throw new Error(`Falha ao limpar ${tabela}: ${error.message}`);
  }
}

// Apaga sobras de execucoes interrompidas (ex.: Ctrl+C no meio dos testes).
export async function apagarTenantsDeTeste(db: SupabaseClient) {
  for (const tabela of TABELAS_DO_TENANT) {
    const { error } = await db.from(tabela).delete().like("tenant_id", `${PREFIXO_TENANT}%`);
    if (error) throw new Error(`Falha ao limpar ${tabela}: ${error.message}`);
  }
}

export async function rpc<T = unknown>(db: SupabaseClient, funcao: string, args: Record<string, unknown>) {
  const { data, error } = await db.rpc(funcao, args);
  if (error) throw new Error(error.message);
  return data as T;
}

export async function criarCliente(db: SupabaseClient, tenant: string, nome = "Cliente teste") {
  const { data, error } = await db
    .from("clientes")
    .insert({ tenant_id: tenant, nome })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function criarProduto(
  db: SupabaseClient,
  tenant: string,
  produto: { nome: string; preco: number; estoque?: number; precoVariavel?: boolean },
) {
  const { data, error } = await db
    .from("produtos")
    .insert({
      tenant_id: tenant,
      nome: produto.nome,
      preco: produto.preco,
      estoque_atual: produto.estoque ?? 0,
      preco_variavel: produto.precoVariavel ?? false,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function lerEstoque(db: SupabaseClient, produtoId: string) {
  const { data, error } = await db.from("produtos").select("estoque_atual").eq("id", produtoId).single();
  if (error) throw new Error(error.message);
  return data.estoque_atual as number;
}

export async function lerPedido(db: SupabaseClient, pedidoId: string) {
  const { data, error } = await db
    .from("pedidos")
    .select("id, numero, status, total, data_entrega, pedido_itens(produto_id, quantidade, preco_unitario, subtotal)")
    .eq("id", pedidoId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function lerMovimentos(db: SupabaseClient, pedidoId: string) {
  const { data, error } = await db
    .from("estoque_movimentos")
    .select("produto_id, tipo, quantidade")
    .eq("pedido_id", pedidoId)
    .order("created_at");
  if (error) throw new Error(error.message);
  return data;
}

export type ItemPedido = { produto_id: string; quantidade: number; preco_unitario?: number };

export function registrarPedido(db: SupabaseClient, tenant: string, clienteId: string, itens: ItemPedido[]) {
  return rpc<string>(db, "registrar_pedido", {
    p_tenant_id: tenant,
    p_cliente_id: clienteId,
    p_itens: itens,
  });
}

export function atualizarStatus(db: SupabaseClient, tenant: string, pedidoId: string, status: string) {
  return rpc<string>(db, "atualizar_status_pedido", {
    p_tenant_id: tenant,
    p_pedido_id: pedidoId,
    p_status: status,
  });
}
