"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { excluirProduto, salvarProduto } from "./actions";
import { TrashIcon } from "@/components/action-icons";

type ProdutoEdicao = {
  id: string;
  nome: string;
  sabor: "frango" | "carne" | "palmito" | "calabresa" | "camarao";
  preco: number;
  estoque_atual: number;
};

const initialState = {
  ok: false,
  message: "",
};

export function ProdutoForm({
  produtoEdicao,
  mostrarCancelarNovo,
}: {
  produtoEdicao: ProdutoEdicao | null;
  mostrarCancelarNovo: boolean;
}) {
  const [state, formAction, isPending] = useActionState(salvarProduto, initialState);
  const emEdicao = Boolean(produtoEdicao);
  const [estoqueAtual, setEstoqueAtual] = useState<number>(produtoEdicao?.estoque_atual ?? 0);

  useEffect(() => {
    setEstoqueAtual(produtoEdicao?.estoque_atual ?? 0);
  }, [produtoEdicao?.id, produtoEdicao?.estoque_atual]);

  return (
    <form action={formAction} className="space-y-4 rounded-xl border border-black/10 bg-surface p-4">
      <h2 className="text-lg font-medium">{emEdicao ? "Editar produto" : "Novo produto"}</h2>

      <input type="hidden" name="id" value={produtoEdicao?.id ?? ""} />

      <div className="grid gap-4 md:grid-cols-4">
        <label className="flex flex-col gap-1 text-sm md:col-span-2">
          Nome do produto
          <input
            name="nome"
            required
            defaultValue={produtoEdicao?.nome ?? ""}
            className="rounded-lg border border-black/15 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring"
            placeholder="Ex.: Garrafa 500ml"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Sabor
          <select
            name="sabor"
            defaultValue={produtoEdicao?.sabor ?? "frango"}
            className="rounded-lg border border-black/15 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring"
          >
            <option value="frango">Frango</option>
            <option value="carne">Carne</option>
            <option value="palmito">Palmito</option>
            <option value="calabresa">Calabresa</option>
            <option value="camarao">Camarao</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Preco (R$)
          <input
            name="preco"
            type="number"
            required
            min="0"
            step="0.01"
            defaultValue={produtoEdicao?.preco ?? ""}
            className="rounded-lg border border-black/15 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring"
            placeholder="0,00"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm md:max-w-xs">
        {emEdicao ? "Estoque atual" : "Estoque inicial"}
        <div className="flex items-center gap-2">
          <input
            name="estoque_atual"
            type="number"
            required
            min="0"
            step="1"
            value={estoqueAtual}
            onChange={(event) => setEstoqueAtual(Math.max(0, Number(event.target.value || 0)))}
            className="w-20 rounded-lg border border-black/15 bg-white px-2 py-2 text-center outline-none ring-primary/40 focus:ring"
            placeholder="0"
          />
          <button
            type="button"
            onClick={() => setEstoqueAtual((valor) => Math.max(0, valor - 1))}
            className="min-w-10 rounded-md border border-black/20 px-3 py-2 text-sm"
            aria-label="Diminuir estoque"
            title="Diminuir estoque"
          >
            -
          </button>
          <button
            type="button"
            onClick={() => setEstoqueAtual((valor) => valor + 1)}
            className="min-w-10 rounded-md border border-black/20 px-3 py-2 text-sm"
            aria-label="Aumentar estoque"
            title="Aumentar estoque"
          >
            +
          </button>
        </div>
      </label>

      {state.message ? (
        <p
          className={`rounded-lg px-3 py-2 text-sm ${
            state.ok ? "bg-green-100 text-green-800" : "bg-red-100 text-red-700"
          }`}
        >
          {state.message}
        </p>
      ) : null}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-contrast disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isPending ? "Salvando..." : emEdicao ? "Salvar" : "Cadastrar produto"}
        </button>

        {emEdicao ? (
          <form action={excluirProduto}>
            <input type="hidden" name="id" value={produtoEdicao?.id ?? ""} />
            <button
              type="submit"
              onClick={(event) => {
                const confirmado = window.confirm("Tem certeza que deseja excluir este produto?");
                if (!confirmado) {
                  event.preventDefault();
                }
              }}
              className="rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700"
              title="Excluir produto"
            >
              <span className="flex items-center gap-2">
                <TrashIcon />
                Excluir
              </span>
            </button>
          </form>
        ) : null}

        {emEdicao || mostrarCancelarNovo ? (
          <Link
            href="/produtos"
            className="rounded-lg border border-black/20 px-4 py-2 text-sm font-medium"
          >
            Cancelar
          </Link>
        ) : null}
      </div>
    </form>
  );
}
