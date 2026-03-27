"use client";

import { useActionState } from "react";
import Link from "next/link";
import { salvarProduto } from "./actions";

type ProdutoEdicao = {
  id: string;
  nome: string;
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

  return (
    <form action={formAction} className="space-y-4 rounded-xl border border-black/10 bg-surface p-4">
      <h2 className="text-lg font-medium">{emEdicao ? "Editar produto" : "Novo produto"}</h2>

      <input type="hidden" name="id" value={produtoEdicao?.id ?? ""} />

      <div className="grid gap-4 md:grid-cols-3">
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
        <input
          name="estoque_atual"
          type="number"
          required
          min="0"
          step="1"
          defaultValue={produtoEdicao?.estoque_atual ?? ""}
          className="rounded-lg border border-black/15 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring"
          placeholder="0"
        />
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
