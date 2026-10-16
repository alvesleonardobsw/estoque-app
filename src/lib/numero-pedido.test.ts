import { describe, expect, it } from "vitest";
import { formatarNumeroPedido } from "./numero-pedido";

describe("formatarNumeroPedido", () => {
  it("completa com zero ate 2 digitos", () => {
    expect(formatarNumeroPedido(1)).toBe("01");
    expect(formatarNumeroPedido(9)).toBe("09");
  });

  it("nao corta numeros maiores", () => {
    expect(formatarNumeroPedido(12)).toBe("12");
    expect(formatarNumeroPedido(123)).toBe("123");
  });
});
