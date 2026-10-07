export const FORMAS_PAGAMENTO = {
  pix: "Pix",
  dinheiro: "Dinheiro",
  credito: "Cartao de credito",
  debito: "Cartao de debito",
} as const;

export type FormaPagamento = keyof typeof FORMAS_PAGAMENTO;

export function ehFormaPagamento(valor: string): valor is FormaPagamento {
  return Object.hasOwn(FORMAS_PAGAMENTO, valor);
}

export function rotuloFormaPagamento(valor: string | null | undefined) {
  return valor && ehFormaPagamento(valor) ? FORMAS_PAGAMENTO[valor] : "";
}
