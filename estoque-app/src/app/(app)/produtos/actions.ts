"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { getSupabaseClient, hasSupabaseEnv } from "@/lib/supabase";

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

  const preco = Number(precoTexto);
  const estoque = Number(estoqueTexto);

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
          estoque_atual: estoque,
        })
        .eq("id", id)
        .eq("tenant_id", sessao.tenantId)
    : await supabase.from("produtos").insert({
        tenant_id: sessao.tenantId,
        nome,
        sabor,
        preco,
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
