import { describe, expect, it } from "vitest";
import {
  CARDAPIO_ALTURA_CONTEUDO,
  CARDAPIO_ALTURA_LINHA,
  CARDAPIO_ALTURA_TITULO,
  montarBlocosCardapio,
  paginarCardapio,
  type BlocoCardapio,
} from "./cardapio";

describe("montarBlocosCardapio", () => {
  it("agrupa por tipo e tamanho, do menor para o maior peso", () => {
    const blocos = montarBlocosCardapio([
      { nome: "Empadão de Frango 1kg", disponivel: 2 },
      { nome: "Empadão de Frango 350g", disponivel: 5 },
      { nome: "Empadão de Carne 350g", disponivel: 3 },
    ]);

    expect(blocos.map((bloco) => bloco.titulo)).toEqual(["Empadão 350g", "Empadão 1kg"]);
  });

  it("ordena os sabores na ordem do cardapio, nao alfabetica", () => {
    const [bloco] = montarBlocosCardapio([
      { nome: "Empadão de Camarão 350g", disponivel: 1 },
      { nome: "Empadão de Carne 350g", disponivel: 1 },
      { nome: "Empadão de Frango 350g", disponivel: 1 },
    ]);

    expect(bloco.linhas.map((linha) => linha.sabor)).toEqual(["Frango", "Carne", "Camarão"]);
  });

  it("deixa de fora produtos sem estoque disponivel", () => {
    const blocos = montarBlocosCardapio([
      { nome: "Empadão de Frango 350g", disponivel: 0 },
      { nome: "Empadão de Carne 350g", disponivel: -1 },
    ]);

    expect(blocos).toEqual([]);
  });

  it("coloca nomes fora do padrao em Outros, por ultimo", () => {
    const blocos = montarBlocosCardapio([
      { nome: "Torta especial", disponivel: 1 },
      { nome: "Empadão de Frango 350g", disponivel: 1 },
    ]);

    expect(blocos.at(-1)).toEqual({ titulo: "Outros", linhas: [{ sabor: "Torta especial", quantidade: 1 }] });
  });
});

describe("paginarCardapio", () => {
  function bloco(titulo: string, quantidadeLinhas: number): BlocoCardapio {
    return {
      titulo,
      linhas: Array.from({ length: quantidadeLinhas }, (_, i) => ({ sabor: `S${i}`, quantidade: 1 })),
    };
  }

  it("junta blocos que cabem na mesma imagem", () => {
    expect(paginarCardapio([bloco("A", 2), bloco("B", 2)])).toHaveLength(1);
  });

  it("nunca divide um bloco entre duas imagens", () => {
    const linhasPorPagina = Math.floor(
      (CARDAPIO_ALTURA_CONTEUDO - CARDAPIO_ALTURA_TITULO) / CARDAPIO_ALTURA_LINHA,
    );
    const paginas = paginarCardapio([bloco("A", linhasPorPagina), bloco("B", 2)]);

    expect(paginas.map((pagina) => pagina.map((b) => b.titulo))).toEqual([["A"], ["B"]]);
  });

  it("sem blocos nao gera imagens", () => {
    expect(paginarCardapio([])).toEqual([]);
  });
});
