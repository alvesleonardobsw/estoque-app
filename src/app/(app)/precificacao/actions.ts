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
  tipo: "ingrediente" | "embalagem" | "gas" | "energia" | "mao_obra" | "outro";
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
  const outrosCustosBrutos = String(formData.get("outros_custos") ?? "[]");

  if (!nome) {
    return { ok: false, message: "Informe o nome do produto." };
  }

  const precoVenda =
    precoVendaTexto === "" ? null : Number.isFinite(Number(precoVendaTexto)) ? Number(precoVendaTexto) : NaN;

  if (precoVenda !== null && (!Number.isFinite(precoVenda) || precoVenda < 0)) {
    return { ok: false, message: "Informe um preco de venda valido." };
  }

  let ingredientes: IngredienteInput[] = [];
  let outrosCustos: IngredienteInput[] = [];

  try {
    const parsed = JSON.parse(ingredientesBrutos);
    if (!Array.isArray(parsed)) {
      return { ok: false, message: "Ingredientes invalidos." };
    }

    ingredientes = parsed
      .map((item) => ({
        tipo: "ingrediente" as const,
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

  try {
    const parsed = JSON.parse(outrosCustosBrutos);
    if (Array.isArray(parsed)) {
      outrosCustos = parsed
        .map((item) => ({
          tipo: String(item?.tipo ?? "outro").trim().toLowerCase() as IngredienteInput["tipo"],
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
    }
  } catch {
    return { ok: false, message: "Nao foi possivel ler os outros custos." };
  }

  const itensPrecificacao = [...ingredientes, ...outrosCustos];

  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc("salvar_produto_precificacao", {
    p_tenant_id: sessao.tenantId,
    p_produto_id: id || null,
    p_nome: nome,
    p_preco_venda: precoVenda,
    p_ingredientes: itensPrecificacao,
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
  const tab = String(formData.get("tab") ?? "").trim();
  const tabQuery = tab === "ingredientes" || tab === "custos" ? `&tab=${tab}` : "";

  if (!hasSupabaseEnv()) {
    redirect(`/precificacao?erro=custo-base${tabQuery}`);
  }

  const sessao = await requireSession();
  const tipo = String(formData.get("tipo") ?? "ingrediente").trim().toLowerCase();
  const nomeInformado = String(formData.get("nome") ?? "").trim();
  const unidadePadraoInformada = String(formData.get("unidade_padrao") ?? "").trim();
  const custoPadraoTexto = String(formData.get("custo_padrao") ?? "").trim().replace(",", ".");
  const custoPadrao = Number(custoPadraoTexto);

  const nome =
    tipo === "ingrediente"
      ? nomeInformado
      : tipo === "embalagem"
        ? "Embalagem"
        : tipo === "gas"
          ? "Gas"
          : tipo === "energia"
            ? "Energia"
            : tipo === "mao_obra"
              ? "Mao de obra"
              : "Outros custos";

  const unidadePadrao = tipo === "ingrediente" ? unidadePadraoInformada : "1 un";

  if (!nome) {
    redirect(`/precificacao?erro=custo-base${tabQuery}`);
  }

  if (!Number.isFinite(custoPadrao) || custoPadrao < 0) {
    redirect(`/precificacao?erro=custo-base${tabQuery}`);
  }

  const supabase = getSupabaseClient();
  const { error } = await supabase.rpc("salvar_custo_base_precificacao", {
    p_tenant_id: sessao.tenantId,
    p_tipo: tipo,
    p_nome: nome,
    p_unidade_padrao: unidadePadrao || null,
    p_custo_padrao: custoPadrao,
  });

  if (error) {
    redirect(`/precificacao?erro=custo-base${tabQuery}`);
  }

  revalidatePath("/precificacao");
  redirect(`/precificacao?sucesso=custo-base${tabQuery}`);
}

export async function excluirIngredienteBasePrecificacao(formData: FormData) {
  const tab = String(formData.get("tab") ?? "").trim();
  const tabQuery = tab === "ingredientes" || tab === "custos" ? `&tab=${tab}` : "";

  if (!hasSupabaseEnv()) {
    redirect(`/precificacao?erro=ingrediente-exclusao${tabQuery}`);
  }

  const sessao = await requireSession();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) {
    redirect(`/precificacao?erro=ingrediente-exclusao${tabQuery}`);
  }

  const supabase = getSupabaseClient();
  const { data: dataRpc, error: errorRpc } = await supabase.rpc("excluir_custo_base_precificacao", {
    p_tenant_id: sessao.tenantId,
    p_custo_base_id: id,
  });

  if (!errorRpc && dataRpc) {
    revalidatePath("/precificacao");
    redirect(`/precificacao?sucesso=ingrediente-excluido${tabQuery}`);
  }

  const erroRpcSemFuncao =
    errorRpc &&
    (errorRpc.message.toLowerCase().includes("function") ||
      errorRpc.message.toLowerCase().includes("does not exist"));

  if (!erroRpcSemFuncao && errorRpc) {
    redirect(`/precificacao?erro=ingrediente-exclusao${tabQuery}`);
  }

  const { data: existente, error: erroBusca } = await supabase
    .from("precificacao_custos_base")
    .select("id")
    .eq("id", id)
    .eq("tenant_id", sessao.tenantId)
    .maybeSingle();

  if (erroBusca || !existente) {
    redirect(`/precificacao?erro=ingrediente-exclusao${tabQuery}`);
  }

  const { error: erroDeleteDireto } = await supabase
    .from("precificacao_custos_base")
    .delete()
    .eq("id", id)
    .eq("tenant_id", sessao.tenantId);

  if (erroDeleteDireto) {
    redirect(`/precificacao?erro=ingrediente-exclusao${tabQuery}`);
  }

  const { data: aindaExiste, error: erroConfirmacao } = await supabase
    .from("precificacao_custos_base")
    .select("id")
    .eq("id", id)
    .eq("tenant_id", sessao.tenantId)
    .maybeSingle();

  if (erroConfirmacao || aindaExiste) {
    redirect(`/precificacao?erro=ingrediente-exclusao${tabQuery}`);
  }

  revalidatePath("/precificacao");
  redirect(`/precificacao?sucesso=ingrediente-excluido${tabQuery}`);
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
