"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseClient, hasSupabaseEnv } from "@/lib/supabase";

type ActionState = {
  ok: boolean;
  message: string;
};

export async function criarCliente(_: ActionState, formData: FormData): Promise<ActionState> {
  if (!hasSupabaseEnv()) {
    return { ok: false, message: "Configure o Supabase antes de cadastrar clientes." };
  }

  const nome = String(formData.get("nome") ?? "").trim();
  const telefone = String(formData.get("telefone") ?? "").trim();
  const endereco = String(formData.get("endereco") ?? "").trim();

  if (!nome) {
    return { ok: false, message: "O nome e obrigatorio." };
  }

  const supabase = getSupabaseClient();

  const { error } = await supabase.from("clientes").insert({
    nome,
    telefone,
    endereco,
  });

  if (error) {
    return { ok: false, message: `Erro ao salvar cliente: ${error.message}` };
  }

  revalidatePath("/clientes");
  return { ok: true, message: "Cliente cadastrado com sucesso." };
}
