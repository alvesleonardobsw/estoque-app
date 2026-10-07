"use client";

import { WalletIcon } from "@/components/action-icons";
import { FORMAS_PAGAMENTO, rotuloFormaPagamento } from "@/lib/forma-pagamento";
import { atualizarFormaPagamentoPedido } from "./actions";

type Props = {
  pedidoId: string;
  formaPagamento: string | null;
};

export function FormaPagamentoButton({ pedidoId, formaPagamento }: Props) {
  const rotulo = rotuloFormaPagamento(formaPagamento);
  const titulo = rotulo ? `Forma de pagamento: ${rotulo}` : "Informar forma de pagamento";

  return (
    <form action={atualizarFormaPagamentoPedido}>
      <input type="hidden" name="pedido_id" value={pedidoId} />
      {/* O select fica invisivel por cima do icone para abrir a lista nativa (boa no celular). */}
      <label
        className={`relative block rounded-md border p-2 text-xs ${
          rotulo ? "border-primary text-primary" : "border-black/20"
        }`}
        title={titulo}
      >
        <WalletIcon />
        <select
          key={formaPagamento ?? ""}
          name="forma_pagamento"
          defaultValue={formaPagamento ?? ""}
          onChange={(event) => event.currentTarget.form?.requestSubmit()}
          aria-label={titulo}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        >
          <option value="">Nao informada</option>
          {Object.entries(FORMAS_PAGAMENTO).map(([valor, rotuloOpcao]) => (
            <option key={valor} value={valor}>
              {rotuloOpcao}
            </option>
          ))}
        </select>
      </label>
    </form>
  );
}
