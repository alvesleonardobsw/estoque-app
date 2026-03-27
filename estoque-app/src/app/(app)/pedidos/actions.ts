"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseClient, hasSupabaseEnv } from "@/lib/supabase";

type ActionState = {
  ok: boolean;
  message: string;
};

type PedidoItemInput = {
  produto_id: string;
  quantidade: number;
};

export async function criarPedido(_: ActionState, formData: FormData): Promise<ActionState> {
  if (!hasSupabaseEnv()) {
    return { ok: false, message: "Configure o Supabase antes de criar pedidos." };
  }

  const clienteId = String(formData.get("cliente_id") ?? "").trim();
  const itensBrutos = String(formData.get("itens") ?? "[]");

  if (!clienteId) {
    return { ok: false, message: "Selecione um cliente." };
  }

  let itens: PedidoItemInput[] = [];

  try {
    const parsed = JSON.parse(itensBrutos);
    if (!Array.isArray(parsed)) {
      return { ok: false, message: "Itens invalidos no pedido." };
    }

    itens = parsed
      .map((item) => ({
        produto_id: String(item?.produto_id ?? "").trim(),
        quantidade: Number(item?.quantidade ?? 0),
      }))
      .filter((item) => item.produto_id && Number.isInteger(item.quantidade) && item.quantidade > 0);
  } catch {
    return { ok: false, message: "Nao foi possivel ler os itens do pedido." };
  }

  if (itens.length === 0) {
    return { ok: false, message: "Adicione pelo menos um item ao pedido." };
  }

  const supabase = getSupabaseClient();
  const { error } = await supabase.rpc("registrar_pedido", {
    p_cliente_id: clienteId,
    p_itens: itens,
  });

  if (error) {
    return { ok: false, message: `Erro ao criar pedido: ${error.message}` };
  }

  revalidatePath("/pedidos");
  revalidatePath("/produtos");
  revalidatePath("/");

  return { ok: true, message: "Pedido criado com sucesso. Estoque atualizado." };
}
