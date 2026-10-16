// Avisos de falta de estoque. Nao bloqueiam nada: o pedido pode ser salvo e entregue
// mesmo sem estoque (encomendas), e o estoque pode ficar negativo.
// Produtos com preco variavel (travessa) nao controlam estoque e ficam de fora.

type Item = { produto_id: string; quantidade: number };

export type PedidoPendente = {
  id: string;
  created_at: string;
  data_entrega_prevista: string | null;
  itens: Item[];
};

export type ProdutoEstoque = {
  nome: string;
  estoque_atual: number;
  preco_variavel: boolean;
};

export type Falta = { produto_id: string; nome: string; falta: number };

export type Disponibilidade = { estoque: number; reservado: number };

export type FaltaNoPedido = Disponibilidade & {
  quantidade: number;
  disponivel: number;
  falta: number;
};

export function somarPorProduto(itens: Item[]) {
  const total = new Map<string, number>();
  for (const item of itens) {
    total.set(item.produto_id, (total.get(item.produto_id) ?? 0) + item.quantidade);
  }
  return total;
}

// Quanto de cada produto ja esta prometido para pedidos pendentes (exceto o que esta sendo editado).
export function reservadoPorProduto(pendentes: PedidoPendente[], excetoPedidoId?: string) {
  return somarPorProduto(pendentes.filter((pedido) => pedido.id !== excetoPedidoId).flatMap((p) => p.itens));
}

// Formulario: compara o que o pedido pede com o que sobra depois dos outros pendentes.
// So entram produtos presentes em `disponibilidade` (os que controlam estoque).
export function faltasNoPedido(itens: Item[], disponibilidade: Record<string, Disponibilidade>) {
  const faltas = new Map<string, FaltaNoPedido>();
  for (const [produtoId, quantidade] of somarPorProduto(itens)) {
    const info = disponibilidade[produtoId];
    if (!info) continue;
    const disponivel = Math.max(0, info.estoque - info.reservado);
    if (quantidade > disponivel) {
      faltas.set(produtoId, { ...info, quantidade, disponivel, falta: quantidade - disponivel });
    }
  }
  return faltas;
}

// Entrega mais cedo primeiro; sem data por ultimo; empate pelo pedido mais antigo.
function compararPrioridade(a: PedidoPendente, b: PedidoPendente) {
  if (a.data_entrega_prevista !== b.data_entrega_prevista) {
    if (!a.data_entrega_prevista) return 1;
    if (!b.data_entrega_prevista) return -1;
    return a.data_entrega_prevista < b.data_entrega_prevista ? -1 : 1;
  }
  return a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0;
}

// Lista de pedidos: distribui o estoque atual entre os pendentes pela prioridade e diz
// o que falta em cada um e no total (o que precisa ser produzido).
export function faltasDosPendentes(pendentes: PedidoPendente[], produtos: Map<string, ProdutoEstoque>) {
  const saldo = new Map<string, number>();
  const porPedido = new Map<string, Falta[]>();
  const aProduzir = new Map<string, Falta>();

  for (const pedido of [...pendentes].sort(compararPrioridade)) {
    const faltasPedido: Falta[] = [];

    for (const [produtoId, quantidade] of somarPorProduto(pedido.itens)) {
      const produto = produtos.get(produtoId);
      if (!produto || produto.preco_variavel) continue;

      const restante = saldo.get(produtoId) ?? Math.max(0, produto.estoque_atual);
      const falta = Math.max(0, quantidade - restante);
      saldo.set(produtoId, Math.max(0, restante - quantidade));
      if (falta === 0) continue;

      faltasPedido.push({ produto_id: produtoId, nome: produto.nome, falta });
      const total = aProduzir.get(produtoId);
      aProduzir.set(produtoId, { produto_id: produtoId, nome: produto.nome, falta: (total?.falta ?? 0) + falta });
    }

    if (faltasPedido.length > 0) porPedido.set(pedido.id, faltasPedido);
  }

  return {
    porPedido,
    aProduzir: [...aProduzir.values()].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
  };
}
