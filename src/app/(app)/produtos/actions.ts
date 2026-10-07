"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { getSupabaseClient, hasSupabaseEnv } from "@/lib/supabase";
import { montarBlocosCardapio, type BlocoCardapio } from "@/lib/cardapio";

type ActionState = {
  ok: boolean;
  message: string;
};

const SABORES_VALIDOS = ["frango", "carne", "palmito", "calabresa", "camarao"] as const;

export async function salvarProduto(_: ActionState, formData: FormData): Promise<ActionState> {
  if (!hasSupabaseEnv()) {
    return { ok: false, message: "Configure o Supabase antes de cadastrar produtos." };
  }

  const sessao = await requireSession();
  const id = String(formData.get("id") ?? "").trim();
  const nome = String(formData.get("nome") ?? "").trim();
  const sabor = String(formData.get("sabor") ?? "").trim();
  const precoTexto = String(formData.get("preco") ?? "").replace(",", ".").trim();
  const estoqueTexto = String(formData.get("estoque_atual") ?? "").trim();
  const precoVariavel = formData.get("preco_variavel") === "on";

  // Produto com preco definido no pedido (ex.: travessa) nao tem preco fixo nem estoque.
  const preco = precoVariavel ? 0 : Number(precoTexto);
  const estoque = precoVariavel ? 0 : Number(estoqueTexto);

  if (!nome) {
    return { ok: false, message: "O nome do produto e obrigatorio." };
  }

  if (!SABORES_VALIDOS.includes(sabor as (typeof SABORES_VALIDOS)[number])) {
    return { ok: false, message: "Selecione um sabor valido." };
  }

  if (!Number.isFinite(preco) || preco < 0) {
    return { ok: false, message: "Informe um preco valido." };
  }

  if (!Number.isInteger(estoque) || estoque < 0) {
    return { ok: false, message: "Estoque inicial deve ser um numero inteiro >= 0." };
  }

  const supabase = getSupabaseClient();
  const { error } = id
    ? await supabase
        .from("produtos")
        .update({
          nome,
          sabor,
          preco,
          preco_variavel: precoVariavel,
          estoque_atual: estoque,
        })
        .eq("id", id)
        .eq("tenant_id", sessao.tenantId)
    : await supabase.from("produtos").insert({
        tenant_id: sessao.tenantId,
        nome,
        sabor,
        preco,
        preco_variavel: precoVariavel,
        estoque_atual: estoque,
      });

  if (error) {
    return { ok: false, message: `Erro ao salvar produto: ${error.message}` };
  }

  revalidatePath("/produtos");
  if (id) {
    redirect("/produtos");
  }

  return { ok: true, message: "Produto cadastrado com sucesso." };
}

export async function excluirProduto(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirect("/produtos?erro=config");
  }

  const sessao = await requireSession();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) {
    redirect("/produtos?erro=exclusao");
  }

  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("produtos")
    .delete()
    .eq("id", id)
    .eq("tenant_id", sessao.tenantId);

  if (error) {
    if (error.code === "23503") {
      const { error: inativarErro } = await supabase
        .from("produtos")
        .update({ ativo: false })
        .eq("id", id)
        .eq("tenant_id", sessao.tenantId);

      if (!inativarErro) {
        revalidatePath("/produtos");
        revalidatePath("/pedidos");
        revalidatePath("/");
        redirect("/produtos?sucesso=inativado");
      }
    }

    redirect("/produtos?erro=exclusao");
  }

  revalidatePath("/produtos");
  revalidatePath("/pedidos");
  revalidatePath("/");
  redirect("/produtos?sucesso=excluido");
}

type CardapioResultado = { ok: true; blocos: BlocoCardapio[] } | { ok: false; message: string };

// Estoque livre para divulgar: estoque atual menos o que ja esta em pedidos pendentes
// (o estoque so e baixado na entrega). Produtos de preco variavel (travessa) ficam de fora.
export async function carregarCardapioDisponivel(): Promise<CardapioResultado> {
  if (!hasSupabaseEnv()) {
    return { ok: false, message: "Configure o Supabase antes de gerar o cardapio." };
  }

  const sessao = await requireSession();
  const supabase = getSupabaseClient();

  const [produtosResp, reservadosResp] = await Promise.all([
    supabase
      .from("produtos")
      .select("id, nome, estoque_atual")
      .eq("tenant_id", sessao.tenantId)
      .eq("ativo", true)
      .eq("preco_variavel", false),
    supabase
      .from("pedido_itens")
      .select("produto_id, quantidade, pedidos!inner(status)")
      .eq("tenant_id", sessao.tenantId)
      .eq("pedidos.status", "pendente"),
  ]);

  const erro = produtosResp.error?.message || reservadosResp.error?.message;
  if (erro) {
    return { ok: false, message: `Erro ao carregar o estoque: ${erro}` };
  }

  const reservados = new Map<string, number>();
  for (const item of reservadosResp.data ?? []) {
    reservados.set(item.produto_id, (reservados.get(item.produto_id) ?? 0) + item.quantidade);
  }

  const blocos = montarBlocosCardapio(
    (produtosResp.data ?? []).map((produto) => ({
      nome: produto.nome,
      disponivel: produto.estoque_atual - (reservados.get(produto.id) ?? 0),
    })),
  );

  return { ok: true, blocos };
}
