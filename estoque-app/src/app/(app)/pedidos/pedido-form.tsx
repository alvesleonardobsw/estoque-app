"use client";

import { useMemo, useState } from "react";
import { useActionState } from "react";
import { criarPedido } from "./actions";

type ClienteOption = {
  id: string;
  nome: string;
};

type ProdutoOption = {
  id: string;
  nome: string;
  preco: number;
  estoque_atual: number;
};

type ItemForm = {
  produto_id: string;
  quantidade: number;
};

const initialState = {
  ok: false,
  message: "",
};

export function PedidoForm({
  clientes,
  produtos,
}: {
  clientes: ClienteOption[];
  produtos: ProdutoOption[];
}) {
  const [state, formAction, isPending] = useActionState(criarPedido, initialState);
  const [itens, setItens] = useState<ItemForm[]>([{ produto_id: "", quantidade: 1 }]);
  const [clienteId, setClienteId] = useState("");

  const produtosPorId = useMemo(() => {
    return new Map(produtos.map((produto) => [produto.id, produto]));
  }, [produtos]);

  const itensValidos = useMemo(() => {
    return itens.filter((item) => item.produto_id && item.quantidade > 0);
  }, [itens]);

  const totalEstimado = useMemo(() => {
    return itensValidos.reduce((acc, item) => {
      const produto = produtosPorId.get(item.produto_id);
      if (!produto) return acc;
      return acc + produto.preco * item.quantidade;
    }, 0);
  }, [itensValidos, produtosPorId]);

  function atualizarItem(index: number, novoItem: ItemForm) {
    setItens((atual) => atual.map((item, i) => (i === index ? novoItem : item)));
  }

  function adicionarItem() {
    setItens((atual) => [...atual, { produto_id: "", quantidade: 1 }]);
  }

  function removerItem(index: number) {
    setItens((atual) => (atual.length === 1 ? atual : atual.filter((_, i) => i !== index)));
  }

  return (
    <form action={formAction} className="space-y-4 rounded-xl border border-black/10 bg-surface p-4">
      <h2 className="text-lg font-medium">Novo pedido</h2>

      <label className="flex max-w-lg flex-col gap-1 text-sm">
        Cliente
        <select
          name="cliente_id"
          required
          value={clienteId}
          onChange={(event) => setClienteId(event.target.value)}
          className="rounded-lg border border-black/15 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring"
        >
          <option value="">Selecione um cliente</option>
          {clientes.map((cliente) => (
            <option key={cliente.id} value={cliente.id}>
              {cliente.nome}
            </option>
          ))}
        </select>
      </label>

      <div className="space-y-3">
        <p className="text-sm font-medium">Itens do pedido</p>

        {itens.map((item, index) => {
          const produto = produtosPorId.get(item.produto_id);
          return (
            <div key={`${index}-${item.produto_id}`} className="grid gap-2 rounded-lg border border-black/10 p-3 md:grid-cols-[1fr_140px_120px]">
              <label className="flex flex-col gap-1 text-sm">
                Produto
                <select
                  value={item.produto_id}
                  onChange={(event) =>
                    atualizarItem(index, {
                      ...item,
                      produto_id: event.target.value,
                    })
                  }
                  className="rounded-lg border border-black/15 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring"
                >
                  <option value="">Selecione</option>
                  {produtos.map((produtoItem) => (
                    <option key={produtoItem.id} value={produtoItem.id}>
                      {produtoItem.nome} (estoque: {produtoItem.estoque_atual})
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-sm">
                Quantidade
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={item.quantidade}
                  onChange={(event) =>
                    atualizarItem(index, {
                      ...item,
                      quantidade: Number(event.target.value),
                    })
                  }
                  className="rounded-lg border border-black/15 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring"
                />
              </label>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => removerItem(index)}
                  className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm"
                >
                  Remover
                </button>
              </div>

              {produto ? (
                <p className="text-xs text-foreground/70 md:col-span-3">
                  Preco unitario:{" "}
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(produto.preco)}
                </p>
              ) : null}
            </div>
          );
        })}

        <button
          type="button"
          onClick={adicionarItem}
          className="rounded-lg border border-black/20 px-3 py-2 text-sm"
        >
          + Adicionar item
        </button>
      </div>

      <input type="hidden" name="itens" value={JSON.stringify(itensValidos)} />

      <p className="text-sm">
        Total estimado:{" "}
        <span className="font-semibold text-primary">
          {new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
          }).format(totalEstimado)}
        </span>
      </p>

      {state.message ? (
        <p
          className={`rounded-lg px-3 py-2 text-sm ${
            state.ok ? "bg-green-100 text-green-800" : "bg-red-100 text-red-700"
          }`}
        >
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending || clientes.length === 0 || produtos.length === 0}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-contrast disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isPending ? "Criando pedido..." : "Criar pedido"}
      </button>
    </form>
  );
}
