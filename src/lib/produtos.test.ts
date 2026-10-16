import { describe, expect, it } from "vitest";
import {
  PESOS_FILTRO,
  ehSabor,
  extrairPesoDoNome,
  filtrarProdutos,
  obterSaborEfetivo,
  type Sabor,
} from "./produtos";

function produto(nome: string, sabor: Sabor = "frango", preco_variavel = false) {
  return { nome, sabor, preco_variavel };
}

const PRODUTOS = [
  produto("Empadão de Frango 350g"),
  produto("Empadão de Frango 1kg"),
  produto("Empadão de Carne 350g", "carne"),
  produto("Empadão de Camarão 350g"), // sabor ficou no padrao "frango" no banco
  produto("Empada de Palmito 50g", "palmito"),
  produto("Travessa de Frango", "frango", true),
];

function nomes(lista: { nome: string }[]) {
  return lista.map((item) => item.nome);
}

describe("obterSaborEfetivo", () => {
  it("usa o sabor do banco quando ele nao e o padrao", () => {
    expect(obterSaborEfetivo(produto("Empadão de Frango 350g", "carne"))).toBe("carne");
  });

  it("infere o sabor pelo nome, ignorando acentos, quando o banco tem o padrao frango", () => {
    expect(obterSaborEfetivo(produto("Empadão de Camarão 350g"))).toBe("camarao");
  });

  it("mantem frango quando o nome nao indica outro sabor", () => {
    expect(obterSaborEfetivo(produto("Empadão 350g"))).toBe("frango");
  });
});

describe("extrairPesoDoNome", () => {
  it("normaliza espacos e maiusculas", () => {
    expect(extrairPesoDoNome("Empadão de Frango 500 G")).toBe("500g");
    expect(extrairPesoDoNome("Empadão de Frango 1KG")).toBe("1kg");
  });

  it("retorna vazio quando o nome nao tem peso", () => {
    expect(extrairPesoDoNome("Travessa de Frango")).toBe("");
  });
});

describe("ehSabor", () => {
  it("aceita so sabores conhecidos", () => {
    expect(ehSabor("camarao")).toBe(true);
    expect(ehSabor("queijo")).toBe(false);
    expect(ehSabor(undefined)).toBe(false);
  });
});

describe("filtrarProdutos", () => {
  it("sem filtro devolve todos", () => {
    expect(filtrarProdutos(PRODUTOS, { sabor: "", peso: "" })).toHaveLength(PRODUTOS.length);
  });

  it("filtra so por sabor, usando o sabor efetivo", () => {
    expect(nomes(filtrarProdutos(PRODUTOS, { sabor: "camarao", peso: "" }))).toEqual([
      "Empadão de Camarão 350g",
    ]);
  });

  it("filtra so por peso", () => {
    expect(nomes(filtrarProdutos(PRODUTOS, { sabor: "", peso: "1kg" }))).toEqual([
      "Empadão de Frango 1kg",
    ]);
  });

  it("filtro travessa traz os produtos de preco variavel", () => {
    expect(nomes(filtrarProdutos(PRODUTOS, { sabor: "", peso: "travessa" }))).toEqual([
      "Travessa de Frango",
    ]);
  });

  // Regressao: fix(produtos) d406c90. Com sabor e peso juntos, o produto precisa atender aos dois.
  it("regressao: sabor e peso combinados devolvem so a intersecao", () => {
    expect(nomes(filtrarProdutos(PRODUTOS, { sabor: "frango", peso: "350g" }))).toEqual([
      "Empadão de Frango 350g",
    ]);
    expect(filtrarProdutos(PRODUTOS, { sabor: "carne", peso: "1kg" })).toEqual([]);
  });

  it("50g nao casa com 500g", () => {
    const lista = [produto("Empada de Frango 50g"), produto("Empadão de Frango 500g")];
    expect(nomes(filtrarProdutos(lista, { sabor: "", peso: "50g" }))).toEqual(["Empada de Frango 50g"]);
  });
});

describe("PESOS_FILTRO", () => {
  // Regressao: fix(produtos) 23088a0. Faltava a opcao de 50g no filtro de peso.
  it("regressao: oferece a opcao de 50g", () => {
    expect(PESOS_FILTRO.map((peso) => peso.valor)).toContain("50g");
  });
});
