import { describe, expect, it } from "vitest";
import { ehFormaPagamento, rotuloFormaPagamento } from "./forma-pagamento";

describe("forma de pagamento", () => {
  it("reconhece so as formas cadastradas", () => {
    expect(ehFormaPagamento("pix")).toBe(true);
    expect(ehFormaPagamento("boleto")).toBe(false);
  });

  it("nao aceita propriedades herdadas do objeto", () => {
    expect(ehFormaPagamento("toString")).toBe(false);
    expect(ehFormaPagamento("__proto__")).toBe(false);
  });

  it("traduz o valor salvo para o rotulo da comanda", () => {
    expect(rotuloFormaPagamento("credito")).toBe("Cartao de credito");
  });

  it("devolve vazio para valor ausente ou desconhecido", () => {
    expect(rotuloFormaPagamento(null)).toBe("");
    expect(rotuloFormaPagamento(undefined)).toBe("");
    expect(rotuloFormaPagamento("boleto")).toBe("");
  });
});
