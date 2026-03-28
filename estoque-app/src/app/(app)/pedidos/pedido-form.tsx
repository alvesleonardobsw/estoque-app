"use client";

import { useMemo, useState } from "react";
import { useActionState } from "react";
import Link from "next/link";
import { salvarPedido } from "./actions";
import { TrashIcon } from "@/components/action-icons";

type ClienteOption = {
  id: string;
  nome: string;
};

type ProdutoOption = {
  id: string;
  nome: string;
  sabor: "frango" | "carne" | "palmito" | "calabresa" | "camarao";
  preco: number;
  estoque_atual: number;
};

type Sabor = "frango" | "carne" | "palmito" | "calabresa" | "camarao";

type ItemForm = {
  sabor: Sabor | "";
  produto_id: string;
  quantidade: number;
};

type PedidoEdicaoItem = {
  produto_id: string;
  quantidade: number;
};

type PedidoEdicao = {
  id: string;
  cliente_id: string;
  itens: PedidoEdicaoItem[];
};

const initialState = {
  ok: false,
  message: "",
};

function normalizarTexto(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function inferirSaborDoNome(nomeProduto: string): Sabor | "" {
  const nome = normalizarTexto(nomeProduto);
  if (nome.includes("camarao")) return "camarao";
  if (nome.includes("calabresa")) return "calabresa";
  if (nome.includes("palmito")) return "palmito";
  if (nome.includes("carne")) return "carne";
  if (nome.includes("frango")) return "frango";
  return "";
}

function obterSaborProduto(produto: ProdutoOption): Sabor {
  const inferido = inferirSaborDoNome(produto.nome);
  if (produto.sabor !== "frango") return produto.sabor;
  if (inferido && inferido !== "frango") return inferido;
  return produto.sabor;
}

export function PedidoForm({
  clientes,
  produtos,
  pedidoEdicao,
  mostrarCancelarNovo,
}: {
  clientes: ClienteOption[];
  produtos: ProdutoOption[];
  pedidoEdicao: PedidoEdicao | null;
  mostrarCancelarNovo: boolean;
}) {
  const [state, formAction, isPending] = useActionState(salvarPedido, initialState);
  const emEdicao = Boolean(pedidoEdicao);
  const itensIniciais: ItemForm[] =
    pedidoEdicao?.itens.length
      ? pedidoEdicao.itens.map((item) => {
          const produto = produtos.find((produtoAtual) => produtoAtual.id === item.produto_id);
          return {
            ...item,
            sabor: produto ? obterSaborProduto(produto) : "",
          };
        })
      : [{ sabor: "", produto_id: "", quantidade: 1 }];
  const [itens, setItens] = useState<ItemForm[]>(
    itensIniciais,
  );
  const [clienteId, setClienteId] = useState(pedidoEdicao?.cliente_id ?? "");

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
    setItens((atual) => [...atual, { sabor: "", produto_id: "", quantidade: 1 }]);
  }

  function removerItem(index: number) {
    setItens((atual) => (atual.length === 1 ? atual : atual.filter((_, i) => i !== index)));
  }

  return (
    <form action={formAction} className="space-y-4 rounded-xl border border-black/10 bg-surface p-4">
      <h2 className="text-lg font-medium">{emEdicao ? "Editar pedido" : "Novo pedido"}</h2>
      <input type="hidden" name="pedido_id" value={pedidoEdicao?.id ?? ""} />

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
          const produtosFiltrados = produtos.filter(
            (produtoItem) => obterSaborProduto(produtoItem) === item.sabor,
          );
          return (
            <div
              key={`${index}-${item.produto_id}`}
              className="grid gap-2 rounded-lg border border-black/10 p-3 md:grid-cols-[120px_minmax(140px,1fr)_180px_56px]"
            >
              <label className="flex flex-col gap-1 text-sm">
                Sabor
                <select
                  value={item.sabor}
                  onChange={(event) =>
                    atualizarItem(index, {
                      ...item,
                      sabor: event.target.value as ItemForm["sabor"],
                      produto_id: "",
                    })
                  }
                  className="rounded-lg border border-black/15 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring"
                >
                  <option value="">Selecione</option>
                  <option value="frango">Frango</option>
                  <option value="carne">Carne</option>
                  <option value="palmito">Palmito</option>
                  <option value="calabresa">Calabresa</option>
                  <option value="camarao">Camarao</option>
                </select>
              </label>

              <label className="flex flex-col gap-1 text-sm">
                Produto
                <select
                  value={item.produto_id}
                  onChange={(event) => {
                    const produtoSelecionado = produtosPorId.get(event.target.value);
                    atualizarItem(index, {
                      ...item,
                      produto_id: event.target.value,
                      sabor: produtoSelecionado ? obterSaborProduto(produtoSelecionado) : item.sabor,
                    });
                  }}
                  className="rounded-lg border border-black/15 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring"
                >
                  <option value="">{item.sabor ? "Selecione" : "Escolha o sabor primeiro"}</option>
                  {produtosFiltrados.map((produtoItem) => (
                    <option key={produtoItem.id} value={produtoItem.id}>
                      {produtoItem.nome} (estoque: {produtoItem.estoque_atual})
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-sm">
                Quantidade
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={item.quantidade}
                    onChange={(event) =>
                      atualizarItem(index, {
                        ...item,
                        quantidade: Math.max(1, Number(event.target.value || 1)),
                      })
                    }
                    className="w-16 rounded-lg border border-black/15 bg-white px-2 py-2 text-center outline-none ring-primary/40 focus:ring"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      atualizarItem(index, {
                        ...item,
                        quantidade: Math.max(1, item.quantidade - 1),
                      })
                    }
                    className="min-w-10 rounded-md border border-black/20 px-3 py-2 text-sm"
                    aria-label="Diminuir quantidade"
                    title="Diminuir quantidade"
                  >
                    -
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      atualizarItem(index, {
                        ...item,
                        quantidade: item.quantidade + 1,
                      })
                    }
                    className="min-w-10 rounded-md border border-black/20 px-3 py-2 text-sm"
                    aria-label="Aumentar quantidade"
                    title="Aumentar quantidade"
                  >
                    +
                  </button>
                </div>
              </label>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => removerItem(index)}
                  className="w-full rounded-lg border border-black/20 p-2 text-sm"
                  aria-label="Remover item"
                  title="Remover item"
                >
                  <span className="flex items-center justify-center">
                    <TrashIcon />
                  </span>
                </button>
              </div>

              {produto ? (
                <p className="text-xs text-foreground/70 md:col-span-4">
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
        {isPending ? "Salvando..." : emEdicao ? "Salvar" : "Criar pedido"}
      </button>

      {emEdicao || mostrarCancelarNovo ? (
        <Link
          href="/pedidos"
          className="ml-2 inline-block rounded-lg border border-black/20 px-4 py-2 text-sm font-medium"
        >
          Cancelar
        </Link>
      ) : null}
    </form>
  );
}
