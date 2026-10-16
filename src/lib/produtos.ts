// Regras de sabor e peso usadas na listagem e no filtro de produtos.

export type Sabor = "frango" | "carne" | "palmito" | "calabresa" | "camarao";

export const SABORES: Sabor[] = ["frango", "carne", "palmito", "calabresa", "camarao"];

// Opcoes do filtro de peso; "travessa" sao os produtos com preco definido no pedido.
export const PESOS_FILTRO = [
  { valor: "50g", rotulo: "50g" },
  { valor: "200g", rotulo: "200g" },
  { valor: "350g", rotulo: "350g" },
  { valor: "500g", rotulo: "500g" },
  { valor: "1kg", rotulo: "1kg" },
  { valor: "travessa", rotulo: "Travessa" },
];

type ProdutoFiltravel = {
  nome: string;
  sabor: Sabor;
  preco_variavel: boolean;
};

export function ehSabor(valor: unknown): valor is Sabor {
  return typeof valor === "string" && (SABORES as string[]).includes(valor);
}

export function normalizarPeso(valor: string) {
  return valor.toLowerCase().replace(/\s+/g, "");
}

function normalizarTexto(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

function inferirSaborDoNome(nomeProduto: string): Sabor | "" {
  const nome = normalizarTexto(nomeProduto);
  if (nome.includes("camarao")) return "camarao";
  if (nome.includes("calabresa")) return "calabresa";
  if (nome.includes("palmito")) return "palmito";
  if (nome.includes("carne")) return "carne";
  if (nome.includes("frango")) return "frango";
  return "";
}

// "frango" e o valor padrao da coluna; nesse caso o sabor escrito no nome prevalece.
export function obterSaborEfetivo(produto: Pick<ProdutoFiltravel, "nome" | "sabor">): Sabor {
  const inferido = inferirSaborDoNome(produto.nome);
  if (produto.sabor !== "frango") return produto.sabor;
  if (inferido && inferido !== "frango") return inferido;
  return produto.sabor;
}

export function extrairPesoDoNome(nome: string) {
  const match = nome.toLowerCase().match(/(\d+\s?(?:g|kg))/);
  return match ? normalizarPeso(match[1]) : "";
}

// Filtros vazios nao restringem; quando os dois estao preenchidos, o produto precisa atender aos dois.
export function filtrarProdutos<T extends ProdutoFiltravel>(
  produtos: T[],
  filtro: { sabor: Sabor | ""; peso: string },
) {
  const peso = normalizarPeso(filtro.peso);
  return produtos.filter((produto) => {
    const matchSabor = !filtro.sabor || obterSaborEfetivo(produto) === filtro.sabor;
    const matchPeso =
      !peso ||
      (peso === "travessa" ? produto.preco_variavel : extrairPesoDoNome(produto.nome) === peso);
    return matchSabor && matchPeso;
  });
}
