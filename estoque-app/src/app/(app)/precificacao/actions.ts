"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { getSupabaseClient, hasSupabaseEnv } from "@/lib/supabase";

type ActionState = {
  ok: boolean;
  message: string;
};

type IngredienteInput = {
  nome: string;
  quantidade: string;
  custo: number;
};

export async function salvarProdutoPrecificacao(
  _: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!hasSupabaseEnv()) {
    return { ok: false, message: "Configure o Supabase antes de salvar a precificacao." };
  }

  const sessao = await requireSession();
  const id = String(formData.get("id") ?? "").trim();
  const nome = String(formData.get("nome") ?? "").trim();
  const precoVendaTexto = String(formData.get("preco_venda") ?? "")
    .trim()
    .replace(",", ".");
  const ingredientesBrutos = String(formData.get("ingredientes") ?? "[]");

  if (!nome) {
    return { ok: false, message: "Informe o nome do produto." };
  }

  const precoVenda =
    precoVendaTexto === "" ? null : Number.isFinite(Number(precoVendaTexto)) ? Number(precoVendaTexto) : NaN;

  if (precoVenda !== null && (!Number.isFinite(precoVenda) || precoVenda < 0)) {
    return { ok: false, message: "Informe um preco de venda valido." };
  }

  let ingredientes: IngredienteInput[] = [];

  try {
    const parsed = JSON.parse(ingredientesBrutos);
    if (!Array.isArray(parsed)) {
      return { ok: false, message: "Ingredientes invalidos." };
    }

    ingredientes = parsed
      .map((item) => ({
        nome: String(item?.nome ?? "").trim(),
        quantidade: String(item?.quantidade ?? "").trim(),
        custo: Number(item?.custo ?? 0),
      }))
      .filter(
        (item) =>
          item.nome &&
          item.quantidade &&
          Number.isFinite(item.custo) &&
          item.custo >= 0,
      );
  } catch {
    return { ok: false, message: "Nao foi possivel ler os ingredientes." };
  }

  if (ingredientes.length === 0) {
    return { ok: false, message: "Adicione pelo menos um ingrediente valido." };
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc("salvar_produto_precificacao", {
    p_tenant_id: sessao.tenantId,
    p_produto_id: id || null,
    p_nome: nome,
    p_preco_venda: precoVenda,
    p_ingredientes: ingredientes,
  });

  if (error) {
    return { ok: false, message: `Erro ao salvar precificacao: ${error.message}` };
  }

  revalidatePath("/precificacao");

  if (id) {
    redirect(`/precificacao?editar=${id}`);
  }

  const novoId = typeof data === "string" ? data : "";
  if (novoId) {
    redirect(`/precificacao?editar=${novoId}`);
  }

  return { ok: true, message: "Precificacao salva com sucesso." };
}

export async function salvarCustoBasePrecificacao(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirect("/precificacao?erro=custo-base");
  }

  const sessao = await requireSession();
  const nome = String(formData.get("nome") ?? "").trim();
  const unidadePadrao = String(formData.get("unidade_padrao") ?? "").trim();
  const custoPadraoTexto = String(formData.get("custo_padrao") ?? "").trim().replace(",", ".");
  const custoPadrao = Number(custoPadraoTexto);

  if (!nome) {
    redirect("/precificacao?erro=custo-base");
  }

  if (!Number.isFinite(custoPadrao) || custoPadrao < 0) {
    redirect("/precificacao?erro=custo-base");
  }

  const supabase = getSupabaseClient();
  const { error } = await supabase.rpc("salvar_custo_base_precificacao", {
    p_tenant_id: sessao.tenantId,
    p_tipo: "ingrediente",
    p_nome: nome,
    p_unidade_padrao: unidadePadrao || null,
    p_custo_padrao: custoPadrao,
  });

  if (error) {
    redirect("/precificacao?erro=custo-base");
  }

  revalidatePath("/precificacao");
  redirect("/precificacao?sucesso=custo-base");
}

export async function excluirIngredienteBasePrecificacao(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirect("/precificacao?erro=ingrediente-exclusao");
  }

  const sessao = await requireSession();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) {
    redirect("/precificacao?erro=ingrediente-exclusao");
  }

  const supabase = getSupabaseClient();
  const { data: dataRpc, error: errorRpc } = await supabase.rpc("excluir_custo_base_precificacao", {
    p_tenant_id: sessao.tenantId,
    p_custo_base_id: id,
  });

  if (!errorRpc && dataRpc) {
    revalidatePath("/precificacao");
    redirect("/precificacao?sucesso=ingrediente-excluido");
  }

  const erroRpcSemFuncao =
    errorRpc &&
    (errorRpc.message.toLowerCase().includes("function") ||
      errorRpc.message.toLowerCase().includes("does not exist"));

  if (!erroRpcSemFuncao && errorRpc) {
    redirect("/precificacao?erro=ingrediente-exclusao");
  }

  const { data: existente, error: erroBusca } = await supabase
    .from("precificacao_custos_base")
    .select("id")
    .eq("id", id)
    .eq("tenant_id", sessao.tenantId)
    .maybeSingle();

  if (erroBusca || !existente) {
    redirect("/precificacao?erro=ingrediente-exclusao");
  }

  const { error: erroDeleteDireto } = await supabase
    .from("precificacao_custos_base")
    .delete()
    .eq("id", id)
    .eq("tenant_id", sessao.tenantId);

  if (erroDeleteDireto) {
    redirect("/precificacao?erro=ingrediente-exclusao");
  }

  const { data: aindaExiste, error: erroConfirmacao } = await supabase
    .from("precificacao_custos_base")
    .select("id")
    .eq("id", id)
    .eq("tenant_id", sessao.tenantId)
    .maybeSingle();

  if (erroConfirmacao || aindaExiste) {
    redirect("/precificacao?erro=ingrediente-exclusao");
  }

  revalidatePath("/precificacao");
  redirect("/precificacao?sucesso=ingrediente-excluido");
}

export async function excluirProdutoPrecificacao(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirect("/precificacao?erro=config");
  }

  const sessao = await requireSession();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) {
    redirect("/precificacao?erro=exclusao");
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc("excluir_produto_precificacao", {
    p_tenant_id: sessao.tenantId,
    p_produto_id: id,
  });

  if (error) {
    redirect("/precificacao?erro=exclusao");
  }

  if (!data) {
    redirect("/precificacao?erro=exclusao");
  }

  revalidatePath("/precificacao");
  redirect("/precificacao?sucesso=excluido");
}
