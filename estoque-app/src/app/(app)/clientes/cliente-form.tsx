"use client";

import { useActionState } from "react";
import { criarCliente } from "./actions";

const initialState = {
  ok: false,
  message: "",
};

export function ClienteForm() {
  const [state, formAction, isPending] = useActionState(criarCliente, initialState);

  return (
    <form action={formAction} className="space-y-4 rounded-xl border border-black/10 bg-surface p-4">
      <h2 className="text-lg font-medium">Novo cliente</h2>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          Nome
          <input
            name="nome"
            required
            className="rounded-lg border border-black/15 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring"
            placeholder="Ex.: Maria Silva"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Telefone
          <input
            name="telefone"
            className="rounded-lg border border-black/15 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring"
            placeholder="(11) 99999-9999"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        Endereco
        <input
          name="endereco"
          className="rounded-lg border border-black/15 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring"
          placeholder="Rua, numero, bairro"
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
        {isPending ? "Salvando..." : "Cadastrar cliente"}
      </button>
    </form>
  );
}
