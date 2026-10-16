// Numero sequencial do pedido dentro do mes (gerado no banco), com no minimo 2 digitos.
export function formatarNumeroPedido(numero: number) {
  return String(numero).padStart(2, "0");
}
