import { describe, expect, it } from "vitest";
import {
  faltasDosPendentes,
  faltasNoPedido,
  reservadoPorProduto,
  type PedidoPendente,
  type ProdutoEstoque,
} from "./estoque";

function pendente(
  id: string,
  itens: [string, number][],
  opcoes: { entrega?: string; criado?: string } = {},
): PedidoPendente {
  return {
    id,
    created_at: opcoes.criado ?? "2026-10-01T12:00:00Z",
    data_entrega_prevista: opcoes.entrega ?? null,
    itens: itens.map(([produto_id, quantidade]) => ({ produto_id, quantidade })),
  };
}

function produtos(lista: Record<string, Partial<ProdutoEstoque> & { estoque_atual: number }>) {
  return new Map(
    Object.entries(lista).map(([id, p]) => [id, { nome: id, preco_variavel: false, ...p } as ProdutoEstoque]),
  );
}

describe("faltasNoPedido (formulario)", () => {
  it("avisa quando a quantidade passa do estoque", () => {
    const faltas = faltasNoPedido([{ produto_id: "frango", quantidade: 3 }], {
      frango: { estoque: 2, reservado: 0 },
    });

    expect(faltas.get("frango")).toEqual({ estoque: 2, reservado: 0, quantidade: 3, disponivel: 2, falta: 1 });
  });

  it("nao avisa quando ha estoque suficiente", () => {
    expect(faltasNoPedido([{ produto_id: "frango", quantidade: 2 }], { frango: { estoque: 2, reservado: 0 } }).size).toBe(0);
  });

  it("desconta o que ja esta reservado para outros pedidos pendentes", () => {
    const faltas = faltasNoPedido([{ produto_id: "frango", quantidade: 2 }], {
      frango: { estoque: 5, reservado: 4 },
    });

    expect(faltas.get("frango")).toMatchObject({ disponivel: 1, falta: 1 });
  });

  it("soma o mesmo produto em linhas diferentes do pedido", () => {
    const faltas = faltasNoPedido(
      [
        { produto_id: "frango", quantidade: 2 },
        { produto_id: "frango", quantidade: 2 },
      ],
      { frango: { estoque: 3, reservado: 0 } },
    );

    expect(faltas.get("frango")).toMatchObject({ quantidade: 4, falta: 1 });
  });

  it("estoque negativo conta como zero disponivel", () => {
    const faltas = faltasNoPedido([{ produto_id: "frango", quantidade: 1 }], {
      frango: { estoque: -3, reservado: 0 },
    });

    expect(faltas.get("frango")).toMatchObject({ disponivel: 0, falta: 1 });
  });

  it("ignora produtos que nao controlam estoque (fora da disponibilidade)", () => {
    expect(faltasNoPedido([{ produto_id: "travessa", quantidade: 10 }], {}).size).toBe(0);
  });
});

describe("reservadoPorProduto", () => {
  it("soma os pendentes, menos o pedido que esta sendo editado", () => {
    const pendentes = [pendente("a", [["frango", 2]]), pendente("b", [["frango", 3], ["carne", 1]])];

    expect(reservadoPorProduto(pendentes)).toEqual(new Map([["frango", 5], ["carne", 1]]));
    expect(reservadoPorProduto(pendentes, "b")).toEqual(new Map([["frango", 2]]));
  });
});

describe("faltasDosPendentes (lista)", () => {
  it("2 em estoque e pedido de 3: falta 1", () => {
    const { porPedido, aProduzir } = faltasDosPendentes(
      [pendente("p1", [["frango", 3]])],
      produtos({ frango: { estoque_atual: 2 } }),
    );

    expect(porPedido.get("p1")).toEqual([{ produto_id: "frango", nome: "frango", falta: 1 }]);
    expect(aProduzir).toEqual([{ produto_id: "frango", nome: "frango", falta: 1 }]);
  });

  it("o estoque vai primeiro para a entrega mais proxima", () => {
    const { porPedido } = faltasDosPendentes(
      [
        pendente("depois", [["frango", 3]], { entrega: "2026-10-20", criado: "2026-10-01T10:00:00Z" }),
        pendente("antes", [["frango", 3]], { entrega: "2026-10-18", criado: "2026-10-02T10:00:00Z" }),
      ],
      produtos({ frango: { estoque_atual: 4 } }),
    );

    expect(porPedido.has("antes")).toBe(false);
    expect(porPedido.get("depois")?.[0].falta).toBe(2);
  });

  it("pedidos sem data de entrega ficam por ultimo; empate vai pelo mais antigo", () => {
    const { porPedido } = faltasDosPendentes(
      [
        pendente("sem-data-antigo", [["frango", 2]], { criado: "2026-10-01T10:00:00Z" }),
        pendente("com-data", [["frango", 2]], { entrega: "2026-12-01", criado: "2026-10-05T10:00:00Z" }),
        pendente("sem-data-novo", [["frango", 2]], { criado: "2026-10-03T10:00:00Z" }),
      ],
      produtos({ frango: { estoque_atual: 4 } }),
    );

    expect([...porPedido.keys()]).toEqual(["sem-data-novo"]);
  });

  it("soma o que falta produzir de todos os pendentes", () => {
    const { aProduzir } = faltasDosPendentes(
      [pendente("a", [["frango", 3], ["carne", 5]]), pendente("b", [["frango", 4]])],
      produtos({ frango: { estoque_atual: 5, nome: "Empadão de Frango" }, carne: { estoque_atual: 0, nome: "Empadão de Carne" } }),
    );

    expect(aProduzir).toEqual([
      { produto_id: "carne", nome: "Empadão de Carne", falta: 5 },
      { produto_id: "frango", nome: "Empadão de Frango", falta: 2 },
    ]);
  });

  it("ignora produtos de preco variavel e produtos desconhecidos", () => {
    const { porPedido, aProduzir } = faltasDosPendentes(
      [pendente("a", [["travessa", 3], ["sumiu", 1]])],
      produtos({ travessa: { estoque_atual: 0, preco_variavel: true } }),
    );

    expect(porPedido.size).toBe(0);
    expect(aProduzir).toEqual([]);
  });
});
