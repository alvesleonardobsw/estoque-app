"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseClient, hasSupabaseEnv } from "@/lib/supabase";

type ActionState = {
  ok: boolean;
  message: string;
};

export async function criarProduto(_: ActionState, formData: FormData): Promise<ActionState> {
  if (!hasSupabaseEnv()) {
    return { ok: false, message: "Configure o Supabase antes de cadastrar produtos." };
  }

  const nome = String(formData.get("nome") ?? "").trim();
  const precoTexto = String(formData.get("preco") ?? "").replace(",", ".").trim();
  const estoqueTexto = String(formData.get("estoque") ?? "").trim();

  const preco = Number(precoTexto);
  const estoque = Number(estoqueTexto);

  if (!nome) {
    return { ok: false, message: "O nome do produto e obrigatorio." };
  }

  if (!Number.isFinite(preco) || preco < 0) {
    return { ok: false, message: "Informe um preco valido." };
  }

  if (!Number.isInteger(estoque) || estoque < 0) {
    return { ok: false, message: "Estoque inicial deve ser um numero inteiro >= 0." };
  }

  const supabase = getSupabaseClient();
  const { error } = await supabase.from("produtos").insert({
    nome,
    preco,
    estoque_atual: estoque,
  });

  if (error) {
    return { ok: false, message: `Erro ao salvar produto: ${error.message}` };
  }

  revalidatePath("/produtos");
  return { ok: true, message: "Produto cadastrado com sucesso." };
}
