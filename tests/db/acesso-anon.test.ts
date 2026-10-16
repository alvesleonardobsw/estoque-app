import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { apagarTenant, bancoAnon, bancoServico, criarCliente, novoTenant } from "./helpers";

// Regressao: fix(supabase) b868e58. A chave publica (anon) e publicada no navegador por
// qualquer cliente Supabase; com ela nao pode dar para ler, gravar nem chamar funcoes.
// Todo acesso do app passa pelo servidor com service_role.

const db = bancoServico();
const anon = bancoAnon();
const tenant = novoTenant();

const TABELAS = [
  "clientes",
  "produtos",
  "pedidos",
  "pedido_itens",
  "estoque_movimentos",
  "precificacao_produtos",
  "precificacao_ingredientes",
  "precificacao_custos_base",
];

const ID = "00000000-0000-0000-0000-000000000000";

const FUNCOES: [string, Record<string, unknown>][] = [
  ["registrar_pedido", { p_tenant_id: tenant, p_cliente_id: ID, p_itens: [] }],
  ["atualizar_pedido", { p_tenant_id: tenant, p_pedido_id: ID, p_cliente_id: ID, p_itens: [] }],
  ["excluir_pedido", { p_tenant_id: tenant, p_pedido_id: ID }],
  ["atualizar_status_pedido", { p_tenant_id: tenant, p_pedido_id: ID, p_status: "entregue" }],
  ["atualizar_data_entrega_prevista_pedido", { p_tenant_id: tenant, p_pedido_id: ID, p_data_entrega_prevista: null }],
  ["atualizar_forma_pagamento_pedido", { p_tenant_id: tenant, p_pedido_id: ID, p_forma_pagamento: "pix" }],
  [
    "salvar_produto_precificacao",
    { p_tenant_id: tenant, p_produto_id: null, p_nome: "x", p_preco_venda: 1, p_ingredientes: [] },
  ],
  [
    "salvar_custo_base_precificacao",
    { p_tenant_id: tenant, p_tipo: "x", p_nome: "x", p_unidade_padrao: "un", p_custo_padrao: 1 },
  ],
  ["excluir_custo_base_precificacao", { p_tenant_id: tenant, p_custo_base_id: ID }],
  ["excluir_produto_precificacao", { p_tenant_id: tenant, p_produto_id: ID }],
];

beforeAll(async () => {
  await criarCliente(db, tenant, "Cliente que o anon nao pode ver");
});

afterAll(async () => {
  await apagarTenant(db, tenant);
});

describe("acesso com a chave anon", () => {
  it.each(TABELAS)("nao le nenhuma linha de %s", async (tabela) => {
    const { data } = await anon.from(tabela).select("*").limit(1);
    expect(data ?? []).toEqual([]);
  });

  it("nao enxerga o cliente criado no tenant de teste", async () => {
    const { data } = await anon.from("clientes").select("id").eq("tenant_id", tenant);
    expect(data ?? []).toEqual([]);
  });

  it("nao consegue cadastrar cliente", async () => {
    const { error } = await anon.from("clientes").insert({ tenant_id: tenant, nome: "Invasor" });
    expect(error).not.toBeNull();

    const { count } = await db
      .from("clientes")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenant)
      .eq("nome", "Invasor");
    expect(count).toBe(0);
  });

  it.each(FUNCOES)("nao executa %s", async (funcao, args) => {
    const { error } = await anon.rpc(funcao, args);
    expect(error?.code).toBe("42501"); // insufficient_privilege
  });
});
