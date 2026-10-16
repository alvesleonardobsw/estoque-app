import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  apagarTenant,
  atualizarStatus,
  bancoServico,
  criarCliente,
  criarProduto,
  lerEstoque,
  lerMovimentos,
  lerPedido,
  novoTenant,
  registrarPedido,
  rpc,
} from "./helpers";

const db = bancoServico();
const tenant = novoTenant();
const outroTenant = novoTenant();
let clienteId: string;

beforeAll(async () => {
  clienteId = await criarCliente(db, tenant);
});

afterAll(async () => {
  await apagarTenant(db, tenant);
  await apagarTenant(db, outroTenant);
});

function produto(nome: string, estoque = 10, preco = 10) {
  return criarProduto(db, tenant, { nome, preco, estoque });
}

function travessa(nome = "Travessa de Frango") {
  return criarProduto(db, tenant, { nome, preco: 0, precoVariavel: true });
}

describe("registrar_pedido", () => {
  it("calcula o total pelo preco do cadastro, ignorando valor enviado para produto de preco fixo", async () => {
    const empadao = await produto("Empadão de Frango 350g", 10, 25);

    const pedidoId = await registrarPedido(db, tenant, clienteId, [
      { produto_id: empadao, quantidade: 2, preco_unitario: 1 },
    ]);

    const pedido = await lerPedido(db, pedidoId);
    expect(Number(pedido?.total)).toBe(50);
    expect(pedido?.pedido_itens).toEqual([
      expect.objectContaining({ quantidade: 2, preco_unitario: 25, subtotal: 50 }),
    ]);
  });

  it("produto de preco variavel usa o valor informado no pedido", async () => {
    const produtoTravessa = await travessa();

    const pedidoId = await registrarPedido(db, tenant, clienteId, [
      { produto_id: produtoTravessa, quantidade: 1, preco_unitario: 89.9 },
    ]);

    expect(Number((await lerPedido(db, pedidoId))?.total)).toBe(89.9);
  });

  it("recusa produto de preco variavel sem valor", async () => {
    const produtoTravessa = await travessa();

    await expect(
      registrarPedido(db, tenant, clienteId, [{ produto_id: produtoTravessa, quantidade: 1 }]),
    ).rejects.toThrow("Informe o valor dos itens com preco definido no pedido.");
  });

  it("pedido pendente nao mexe no estoque", async () => {
    const empadao = await produto("Empadão de Carne 350g", 10);

    const pedidoId = await registrarPedido(db, tenant, clienteId, [{ produto_id: empadao, quantidade: 3 }]);

    expect(await lerEstoque(db, empadao)).toBe(10);
    expect(await lerMovimentos(db, pedidoId)).toEqual([]);
  });

  it("e atomico: um item invalido nao deixa pedido pela metade", async () => {
    const empadao = await produto("Empadão de Palmito 350g");
    const clienteNovo = await criarCliente(db, tenant, "Cliente atomico");

    await expect(
      registrarPedido(db, tenant, clienteNovo, [
        { produto_id: empadao, quantidade: 1 },
        { produto_id: empadao, quantidade: 0 },
      ]),
    ).rejects.toThrow("Item de pedido invalido.");

    const { count } = await db
      .from("pedidos")
      .select("id", { count: "exact", head: true })
      .eq("cliente_id", clienteNovo);
    expect(count).toBe(0);
  });

  it("nao aceita cliente de outro tenant", async () => {
    const clienteDeFora = await criarCliente(db, outroTenant, "Cliente de outra conta");
    const empadao = await produto("Empadão de Frango 500g");

    await expect(
      registrarPedido(db, tenant, clienteDeFora, [{ produto_id: empadao, quantidade: 1 }]),
    ).rejects.toThrow("Cliente nao encontrado para esta conta.");
  });

  it("nao aceita produto de outro tenant", async () => {
    const produtoDeFora = await criarProduto(db, outroTenant, { nome: "Empadão de Fora 350g", preco: 1 });

    await expect(
      registrarPedido(db, tenant, clienteId, [{ produto_id: produtoDeFora, quantidade: 1 }]),
    ).rejects.toThrow("Produto nao encontrado.");
  });
});

describe("atualizar_status_pedido", () => {
  it("entregar baixa o estoque e registra a saida; produto de preco variavel nao entra", async () => {
    const empadao = await produto("Empadão de Calabresa 350g", 10);
    const produtoTravessa = await travessa();
    const pedidoId = await registrarPedido(db, tenant, clienteId, [
      { produto_id: empadao, quantidade: 3 },
      { produto_id: produtoTravessa, quantidade: 1, preco_unitario: 50 },
    ]);

    await atualizarStatus(db, tenant, pedidoId, "entregue");

    expect(await lerEstoque(db, empadao)).toBe(7);
    expect(await lerEstoque(db, produtoTravessa)).toBe(0);
    expect(await lerMovimentos(db, pedidoId)).toEqual([{ produto_id: empadao, tipo: "saida", quantidade: 3 }]);
    const pedido = await lerPedido(db, pedidoId);
    expect(pedido?.status).toBe("entregue");
    expect(pedido?.data_entrega).not.toBeNull();
  });

  it("marcar como entregue de novo nao baixa o estoque duas vezes", async () => {
    const empadao = await produto("Empadão de Frango 1kg", 10);
    const pedidoId = await registrarPedido(db, tenant, clienteId, [{ produto_id: empadao, quantidade: 2 }]);

    await atualizarStatus(db, tenant, pedidoId, "entregue");
    await atualizarStatus(db, tenant, pedidoId, "entregue");

    expect(await lerEstoque(db, empadao)).toBe(8);
  });

  it("voltar para pendente devolve o estoque e limpa a data de entrega", async () => {
    const empadao = await produto("Empadão de Camarão 350g", 10);
    const pedidoId = await registrarPedido(db, tenant, clienteId, [{ produto_id: empadao, quantidade: 4 }]);

    await atualizarStatus(db, tenant, pedidoId, "entregue");
    await atualizarStatus(db, tenant, pedidoId, "pendente");

    expect(await lerEstoque(db, empadao)).toBe(10);
    expect((await lerMovimentos(db, pedidoId)).map((m) => m.tipo)).toEqual(["saida", "entrada"]);
    expect((await lerPedido(db, pedidoId))?.data_entrega).toBeNull();
  });

  // Nao ha trava de estoque: a constraint produtos_estoque_atual_check foi removida de proposito.
  // Se um dia o estoque passar a bloquear a entrega, este teste deve mudar junto.
  it("permite entregar mais do que o estoque (estoque fica negativo)", async () => {
    const empadao = await produto("Empada de Frango 50g", 1);
    const pedidoId = await registrarPedido(db, tenant, clienteId, [{ produto_id: empadao, quantidade: 3 }]);

    await atualizarStatus(db, tenant, pedidoId, "entregue");

    expect(await lerEstoque(db, empadao)).toBe(-2);
  });

  it("recusa status desconhecido", async () => {
    const empadao = await produto("Empadão de Frango 200g");
    const pedidoId = await registrarPedido(db, tenant, clienteId, [{ produto_id: empadao, quantidade: 1 }]);

    await expect(atualizarStatus(db, tenant, pedidoId, "cancelado")).rejects.toThrow("Status invalido.");
  });

  it("outro tenant nao consegue entregar o pedido nem mexer no estoque", async () => {
    const empadao = await produto("Empadão de Carne 1kg", 10);
    const pedidoId = await registrarPedido(db, tenant, clienteId, [{ produto_id: empadao, quantidade: 2 }]);

    await expect(atualizarStatus(db, outroTenant, pedidoId, "entregue")).rejects.toThrow(
      "Pedido nao encontrado.",
    );
    expect(await lerEstoque(db, empadao)).toBe(10);
  });
});

describe("atualizar_pedido", () => {
  function atualizarPedido(pedidoId: string, itens: { produto_id: string; quantidade: number }[]) {
    return rpc(db, "atualizar_pedido", {
      p_tenant_id: tenant,
      p_pedido_id: pedidoId,
      p_cliente_id: clienteId,
      p_itens: itens,
    });
  }

  it("pedido pendente: troca os itens e recalcula o total sem mexer no estoque", async () => {
    const empadao = await produto("Empadão de Frango 350g (editar)", 10, 20);
    const pedidoId = await registrarPedido(db, tenant, clienteId, [{ produto_id: empadao, quantidade: 1 }]);

    await atualizarPedido(pedidoId, [{ produto_id: empadao, quantidade: 3 }]);

    expect(Number((await lerPedido(db, pedidoId))?.total)).toBe(60);
    expect(await lerEstoque(db, empadao)).toBe(10);
  });

  it("pedido entregue: ajusta o estoque pela nova quantidade", async () => {
    const empadao = await produto("Empadão de Carne 350g (editar)", 10);
    const pedidoId = await registrarPedido(db, tenant, clienteId, [{ produto_id: empadao, quantidade: 3 }]);
    await atualizarStatus(db, tenant, pedidoId, "entregue");

    await atualizarPedido(pedidoId, [{ produto_id: empadao, quantidade: 5 }]);

    expect(await lerEstoque(db, empadao)).toBe(5);
  });

  it("pedido entregue: trocar o produto devolve o antigo e baixa o novo", async () => {
    const antigo = await produto("Empadão de Palmito 350g (antigo)", 10);
    const novo = await produto("Empadão de Palmito 500g (novo)", 10);
    const pedidoId = await registrarPedido(db, tenant, clienteId, [{ produto_id: antigo, quantidade: 2 }]);
    await atualizarStatus(db, tenant, pedidoId, "entregue");

    await atualizarPedido(pedidoId, [{ produto_id: novo, quantidade: 2 }]);

    expect(await lerEstoque(db, antigo)).toBe(10);
    expect(await lerEstoque(db, novo)).toBe(8);
  });
});

describe("excluir_pedido", () => {
  function excluirPedido(pedidoId: string) {
    return rpc(db, "excluir_pedido", { p_tenant_id: tenant, p_pedido_id: pedidoId });
  }

  it("pedido entregue: devolve o estoque e apaga o pedido com os itens", async () => {
    const empadao = await produto("Empadão de Frango 350g (excluir)", 10);
    const pedidoId = await registrarPedido(db, tenant, clienteId, [{ produto_id: empadao, quantidade: 4 }]);
    await atualizarStatus(db, tenant, pedidoId, "entregue");

    await excluirPedido(pedidoId);

    expect(await lerEstoque(db, empadao)).toBe(10);
    expect(await lerPedido(db, pedidoId)).toBeNull();
    const { count } = await db
      .from("pedido_itens")
      .select("id", { count: "exact", head: true })
      .eq("pedido_id", pedidoId);
    expect(count).toBe(0);
  });

  it("pedido pendente: apaga sem mexer no estoque", async () => {
    const empadao = await produto("Empadão de Carne 350g (excluir)", 10);
    const pedidoId = await registrarPedido(db, tenant, clienteId, [{ produto_id: empadao, quantidade: 4 }]);

    await excluirPedido(pedidoId);

    expect(await lerEstoque(db, empadao)).toBe(10);
    expect(await lerPedido(db, pedidoId)).toBeNull();
  });

  it("outro tenant nao consegue excluir o pedido", async () => {
    const empadao = await produto("Empadão de Calabresa 350g (excluir)");
    const pedidoId = await registrarPedido(db, tenant, clienteId, [{ produto_id: empadao, quantidade: 1 }]);

    await expect(
      rpc(db, "excluir_pedido", { p_tenant_id: outroTenant, p_pedido_id: pedidoId }),
    ).rejects.toThrow("Pedido nao encontrado.");
    expect(await lerPedido(db, pedidoId)).not.toBeNull();
  });
});
