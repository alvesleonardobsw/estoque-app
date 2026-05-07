"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { getSupabaseClient, hasSupabaseEnv } from "@/lib/supabase";

type ActionState = {
  ok: boolean;
  message: string;
};

type PedidoItemInput = {
  produto_id: string;
  quantidade: number;
};

export async function salvarPedido(_: ActionState, formData: FormData): Promise<ActionState> {
  if (!hasSupabaseEnv()) {
    return { ok: false, message: "Configure o Supabase antes de criar pedidos." };
  }

  const sessao = await requireSession();
  const pedidoId = String(formData.get("pedido_id") ?? "").trim();
  const clienteId = String(formData.get("cliente_id") ?? "").trim();
  const dataEntregaPrevistaRaw = String(formData.get("data_entrega_prevista") ?? "").trim();
  const itensBrutos = String(formData.get("itens") ?? "[]");

  if (dataEntregaPrevistaRaw && !/^\d{4}-\d{2}-\d{2}$/.test(dataEntregaPrevistaRaw)) {
    return { ok: false, message: "Data de entrega invalida." };
  }

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
  const { data, error } = pedidoId
    ? await supabase.rpc("atualizar_pedido", {
        p_tenant_id: sessao.tenantId,
        p_pedido_id: pedidoId,
        p_cliente_id: clienteId,
        p_itens: itens,
      })
    : await supabase.rpc("registrar_pedido", {
        p_tenant_id: sessao.tenantId,
        p_cliente_id: clienteId,
        p_itens: itens,
      });

  if (error) {
    return { ok: false, message: `Erro ao salvar pedido: ${error.message}` };
  }

  const pedidoPersistidoId = pedidoId || (typeof data === "string" ? data : "");
  if (pedidoPersistidoId) {
    const { error: erroDataEntrega } = await supabase.rpc("atualizar_data_entrega_prevista_pedido", {
      p_tenant_id: sessao.tenantId,
      p_pedido_id: pedidoPersistidoId,
      p_data_entrega_prevista: dataEntregaPrevistaRaw || null,
    });

    if (erroDataEntrega) {
      return {
        ok: false,
        message: `Pedido salvo, mas falhou ao salvar data de entrega: ${erroDataEntrega.message}`,
      };
    }
  }

  revalidatePath("/pedidos");
  revalidatePath("/produtos");
  revalidatePath("/");

  if (pedidoId) {
    redirect("/pedidos");
  }

  return { ok: true, message: "Pedido salvo com sucesso." };
}

export async function excluirPedido(formData: FormData) {
  if (!hasSupabaseEnv()) return;
  const sessao = await requireSession();

  const pedidoId = String(formData.get("pedido_id") ?? "").trim();
  if (!pedidoId) return;

  const supabase = getSupabaseClient();
  await supabase.rpc("excluir_pedido", {
    p_tenant_id: sessao.tenantId,
    p_pedido_id: pedidoId,
  });

  revalidatePath("/pedidos");
  revalidatePath("/produtos");
  revalidatePath("/");
}

export async function atualizarStatusPedido(formData: FormData) {
  if (!hasSupabaseEnv()) return;
  const sessao = await requireSession();

  const pedidoId = String(formData.get("pedido_id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  if (!pedidoId) return;
  if (status !== "pendente" && status !== "entregue") return;

  const supabase = getSupabaseClient();
  await supabase.rpc("atualizar_status_pedido", {
    p_tenant_id: sessao.tenantId,
    p_pedido_id: pedidoId,
    p_status: status,
  });

  revalidatePath("/pedidos");
  revalidatePath("/");
}
