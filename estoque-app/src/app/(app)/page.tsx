import { getSupabaseClient, hasSupabaseEnv } from "@/lib/supabase";

type PedidoResumo = {
  id: string;
  total: number;
  created_at: string;
  clientes: { nome: string } | { nome: string }[] | null;
};

type ProdutoEstoque = {
  id: string;
  nome: string;
  estoque_atual: number;
};

function InfoCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string;
  subtitle: string;
}) {
  return (
    <article className="rounded-xl border border-black/10 bg-surface p-4 shadow-sm">
      <h2 className="text-sm font-medium text-foreground/80">{title}</h2>
      <p className="mt-2 text-3xl font-semibold text-primary">{value}</p>
      <p className="mt-1 text-sm text-foreground/70">{subtitle}</p>
    </article>
  );
}

function formatarMoeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

function formatarData(dataIso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(dataIso));
}

function extrairNomeCliente(relacao: { nome: string } | { nome: string }[] | null | undefined) {
  if (!relacao) return "Cliente nao encontrado";
  if (Array.isArray(relacao)) return relacao[0]?.nome ?? "Cliente nao encontrado";
  return relacao.nome ?? "Cliente nao encontrado";
}

async function carregarDashboard() {
  if (!hasSupabaseEnv()) {
    return {
      totalClientes: 0,
      totalProdutos: 0,
      totalEstoque: 0,
      pedidosHoje: 0,
      vendasHoje: 0,
      ultimosPedidos: [] as PedidoResumo[],
      produtosBaixoEstoque: [] as ProdutoEstoque[],
      erro: "",
    };
  }

  const supabase = getSupabaseClient();
  const inicioHoje = new Date();
  inicioHoje.setHours(0, 0, 0, 0);

  const [clientesResp, produtosCountResp, produtosResp, pedidosHojeResp, pedidosResp] =
    await Promise.all([
      supabase.from("clientes").select("id", { count: "exact", head: true }),
      supabase.from("produtos").select("id", { count: "exact", head: true }),
      supabase.from("produtos").select("id, nome, estoque_atual").order("estoque_atual", { ascending: true }),
      supabase
        .from("pedidos")
        .select("id, total, created_at")
        .gte("created_at", inicioHoje.toISOString()),
      supabase
        .from("pedidos")
        .select("id, total, created_at, clientes(nome)")
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

  const erro =
    clientesResp.error?.message ||
    produtosCountResp.error?.message ||
    produtosResp.error?.message ||
    pedidosHojeResp.error?.message ||
    pedidosResp.error?.message ||
    "";

  const produtos = (produtosResp.data ?? []) as ProdutoEstoque[];
  const pedidosHoje = pedidosHojeResp.data ?? [];

  const totalEstoque = produtos.reduce((acc, produto) => acc + produto.estoque_atual, 0);
  const vendasHoje = pedidosHoje.reduce((acc, pedido) => acc + Number(pedido.total ?? 0), 0);
  const produtosBaixoEstoque = produtos.filter((produto) => produto.estoque_atual <= 5).slice(0, 5);

  return {
    totalClientes: clientesResp.count ?? 0,
    totalProdutos: produtosCountResp.count ?? 0,
    totalEstoque,
    pedidosHoje: pedidosHoje.length,
    vendasHoje,
    ultimosPedidos: (pedidosResp.data ?? []) as PedidoResumo[],
    produtosBaixoEstoque,
    erro,
  };
}

export default async function DashboardPage() {
  const dados = await carregarDashboard();

  return (
    <section className="space-y-6">
      <header>
        <p className="text-sm text-foreground/70">Visao geral</p>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
      </header>

      {!hasSupabaseEnv() ? (
        <article className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Configure as variaveis `NEXT_PUBLIC_SUPABASE_URL` e
          `NEXT_PUBLIC_SUPABASE_ANON_KEY` no arquivo `.env.local`.
        </article>
      ) : null}

      {dados.erro ? (
        <article className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Nao foi possivel carregar os indicadores: {dados.erro}. Confira se o SQL de
          `supabase/schema.sql` foi executado.
        </article>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <InfoCard
          title="Clientes Cadastrados"
          value={String(dados.totalClientes)}
          subtitle="Base ativa de clientes"
        />
        <InfoCard
          title="Produtos Cadastrados"
          value={String(dados.totalProdutos)}
          subtitle="Itens disponiveis no catalogo"
        />
        <InfoCard
          title="Estoque Total"
          value={String(dados.totalEstoque)}
          subtitle="Soma das unidades em estoque"
        />
        <InfoCard
          title="Vendas do Dia"
          value={formatarMoeda(dados.vendasHoje)}
          subtitle={`${dados.pedidosHoje} pedido(s) hoje`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl border border-black/10 bg-surface p-4">
          <h2 className="text-lg font-medium">Ultimos pedidos</h2>
          {dados.ultimosPedidos.length === 0 ? (
            <p className="mt-3 text-sm text-foreground/70">Ainda nao existem pedidos registrados.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {dados.ultimosPedidos.map((pedido) => (
                <li key={pedido.id} className="rounded-lg border border-black/10 p-3">
                  <p className="font-medium">{extrairNomeCliente(pedido.clientes)}</p>
                  <p className="text-foreground/70">{formatarData(pedido.created_at)}</p>
                  <p className="mt-1 text-primary">{formatarMoeda(Number(pedido.total ?? 0))}</p>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="rounded-xl border border-black/10 bg-surface p-4">
          <h2 className="text-lg font-medium">Alerta de estoque baixo</h2>
          {dados.produtosBaixoEstoque.length === 0 ? (
            <p className="mt-3 text-sm text-foreground/70">
              Nenhum produto com estoque critico (&lt;= 5 unidades).
            </p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {dados.produtosBaixoEstoque.map((produto) => (
                <li
                  key={produto.id}
                  className={`flex items-center justify-between rounded-lg border p-3 ${
                    produto.estoque_atual === 0
                      ? "border-red-200 bg-red-50"
                      : "border-black/10"
                  }`}
                >
                  <span>{produto.nome}</span>
                  <span
                    className={`font-semibold ${
                      produto.estoque_atual === 0 ? "text-red-700" : "text-primary"
                    }`}
                  >
                    {produto.estoque_atual} un.
                  </span>
                </li>
              ))}
            </ul>
          )}
        </article>
      </div>
    </section>
  );
}
