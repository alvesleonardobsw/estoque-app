"use client";

import { useActionState } from "react";
import { criarProduto } from "./actions";

const initialState = {
  ok: false,
  message: "",
};

export function ProdutoForm() {
  const [state, formAction, isPending] = useActionState(criarProduto, initialState);

  return (
    <form action={formAction} className="space-y-4 rounded-xl border border-black/10 bg-surface p-4">
      <h2 className="text-lg font-medium">Novo produto</h2>

      <div className="grid gap-4 md:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm md:col-span-2">
          Nome do produto
          <input
            name="nome"
            required
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
            className="rounded-lg border border-black/15 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring"
            placeholder="0,00"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm md:max-w-xs">
        Estoque inicial
        <input
          name="estoque"
          type="number"
          required
          min="0"
          step="1"
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

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-contrast disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isPending ? "Salvando..." : "Cadastrar produto"}
      </button>
    </form>
  );
}
