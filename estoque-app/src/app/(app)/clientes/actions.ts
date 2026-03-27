"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSupabaseClient, hasSupabaseEnv } from "@/lib/supabase";

type ActionState = {
  ok: boolean;
  message: string;
};

export async function salvarCliente(_: ActionState, formData: FormData): Promise<ActionState> {
  if (!hasSupabaseEnv()) {
    return { ok: false, message: "Configure o Supabase antes de cadastrar clientes." };
  }

  const id = String(formData.get("id") ?? "").trim();
  const nome = String(formData.get("nome") ?? "").trim();
  const telefone = String(formData.get("telefone") ?? "").trim();
  const endereco = String(formData.get("endereco") ?? "").trim();

  if (!nome) {
    return { ok: false, message: "O nome e obrigatorio." };
  }

  const supabase = getSupabaseClient();

  const { error } = id
    ? await supabase
        .from("clientes")
        .update({
          nome,
          telefone,
          endereco,
        })
        .eq("id", id)
    : await supabase.from("clientes").insert({
        nome,
        telefone,
        endereco,
      });

  if (error) {
    return { ok: false, message: `Erro ao salvar cliente: ${error.message}` };
  }

  revalidatePath("/clientes");

  if (id) {
    redirect("/clientes");
  }

  return {
    ok: true,
    message: "Cliente cadastrado com sucesso.",
  };
}

export async function excluirCliente(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirect("/clientes?erro=config");
  }

  const id = String(formData.get("id") ?? "").trim();
  if (!id) {
    redirect("/clientes?erro=exclusao");
  }

  const supabase = getSupabaseClient();
  const { error } = await supabase.from("clientes").delete().eq("id", id);

  if (error) {
    if (error.code === "23503") {
      redirect("/clientes?erro=cliente-com-pedidos");
    }
    redirect("/clientes?erro=exclusao");
  }

  revalidatePath("/clientes");
  redirect("/clientes");
}
