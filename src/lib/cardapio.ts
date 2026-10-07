// Monta o cardapio de divulgacao (imagem para o WhatsApp) a partir do estoque disponivel.

export type LinhaCardapio = {
  sabor: string;
  quantidade: number;
};

export type BlocoCardapio = {
  titulo: string;
  linhas: LinhaCardapio[];
};

// Alturas fixas (em px na imagem de 1080x1920) usadas para dividir os blocos entre imagens.
export const CARDAPIO_ALTURA_TITULO = 100;
export const CARDAPIO_ALTURA_LINHA = 105;
export const CARDAPIO_ALTURA_CONTEUDO = 1250;

const ORDEM_SABORES = ["frango", "carne", "palmito", "calabresa", "camarao"];

function normalizarTexto(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

function ordemSabor(sabor: string) {
  const indice = ORDEM_SABORES.indexOf(normalizarTexto(sabor));
  return indice === -1 ? ORDEM_SABORES.length : indice;
}

// "Empadão de Frango 350g" -> tipo "Empadão", sabor "Frango", tamanho "350g" (350 gramas).
function interpretarNome(nome: string) {
  const match = nome.trim().match(/^(.+?)\s+de\s+(.+?)\s+(\d+(?:[.,]\d+)?)\s*(kg|g)$/i);
  if (!match) return null;
  const [, tipo, sabor, numero, unidade] = match;
  const valor = Number(numero.replace(",", "."));
  const gramas = unidade.toLowerCase() === "kg" ? valor * 1000 : valor;
  return { tipo, sabor, tamanho: `${numero}${unidade.toLowerCase()}`, gramas };
}

export function montarBlocosCardapio(produtos: { nome: string; disponivel: number }[]) {
  const blocos = new Map<string, BlocoCardapio & { gramas: number }>();

  for (const produto of produtos) {
    if (produto.disponivel <= 0) continue;
    const info = interpretarNome(produto.nome);
    const titulo = info ? `${info.tipo} ${info.tamanho}` : "Outros";
    const bloco = blocos.get(titulo) ?? { titulo, linhas: [], gramas: info?.gramas ?? Infinity };
    bloco.linhas.push({ sabor: info?.sabor ?? produto.nome, quantidade: produto.disponivel });
    blocos.set(titulo, bloco);
  }

  return [...blocos.values()]
    .sort((a, b) => a.gramas - b.gramas || a.titulo.localeCompare(b.titulo, "pt-BR"))
    .map(({ titulo, linhas }) => ({
      titulo,
      linhas: linhas.sort(
        (a, b) => ordemSabor(a.sabor) - ordemSabor(b.sabor) || a.sabor.localeCompare(b.sabor, "pt-BR"),
      ),
    }));
}

// Cada tamanho fica inteiro em uma imagem; quando o proximo nao cabe, vai para a seguinte.
export function paginarCardapio(blocos: BlocoCardapio[]) {
  const paginas: BlocoCardapio[][] = [];
  let atual: BlocoCardapio[] = [];
  let alturaAtual = 0;

  for (const bloco of blocos) {
    const altura = CARDAPIO_ALTURA_TITULO + bloco.linhas.length * CARDAPIO_ALTURA_LINHA;
    if (atual.length > 0 && alturaAtual + altura > CARDAPIO_ALTURA_CONTEUDO) {
      paginas.push(atual);
      atual = [];
      alturaAtual = 0;
    }
    atual.push(bloco);
    alturaAtual += altura;
  }

  if (atual.length > 0) paginas.push(atual);
  return paginas;
}
