"use client";

import { useActionState } from "react";
import Link from "next/link";
import { excluirCliente, salvarCliente } from "./actions";
import { TrashIcon } from "@/components/action-icons";

type ClienteEdicao = {
  id: string;
  nome: string;
  telefone: string | null;
  endereco: string | null;
};

const initialState = {
  ok: false,
  message: "",
};

export function ClienteForm({
  clienteEdicao,
  mostrarCancelarNovo,
}: {
  clienteEdicao: ClienteEdicao | null;
  mostrarCancelarNovo: boolean;
}) {
  const [state, formAction, isPending] = useActionState(salvarCliente, initialState);
  const emEdicao = Boolean(clienteEdicao);

  return (
    <form action={formAction} className="space-y-4 rounded-xl border border-black/10 bg-surface p-4">
      <h2 className="text-lg font-medium">{emEdicao ? "Editar cliente" : "Novo cliente"}</h2>

      <input type="hidden" name="id" value={clienteEdicao?.id ?? ""} />

      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          Nome
          <input
            name="nome"
            required
            defaultValue={clienteEdicao?.nome ?? ""}
            className="rounded-lg border border-black/15 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring"
            placeholder="Ex.: Maria Silva"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Telefone
          <input
            name="telefone"
            defaultValue={clienteEdicao?.telefone ?? ""}
            className="rounded-lg border border-black/15 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring"
            placeholder="(11) 99999-9999"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        Endereco
        <input
          name="endereco"
          defaultValue={clienteEdicao?.endereco ?? ""}
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

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-contrast disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isPending ? "Salvando..." : emEdicao ? "Salvar" : "Cadastrar cliente"}
        </button>

        {emEdicao ? (
          <form action={excluirCliente}>
            <input type="hidden" name="id" value={clienteEdicao?.id ?? ""} />
            <button
              type="submit"
              onClick={(event) => {
                const confirmado = window.confirm("Tem certeza que deseja excluir este cliente?");
                if (!confirmado) {
                  event.preventDefault();
                }
              }}
              className="rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700"
              title="Excluir cliente"
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
            href="/clientes"
            className="rounded-lg border border-black/20 px-4 py-2 text-sm font-medium"
          >
            Cancelar
          </Link>
        ) : null}
      </div>
    </form>
  );
}
