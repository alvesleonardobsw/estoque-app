import { getSupabaseClient, hasSupabaseEnv } from "@/lib/supabase";
import { PedidoForm } from "./pedido-form";

type Cliente = {
  id: string;
  nome: string;
};

type Produto = {
  id: string;
  nome: string;
  preco: number;
  estoque_atual: number;
};

type PedidoLista = {
  id: string;
  total: number;
  created_at: string;
  clientes: {
    nome: string;
  } | { nome: string }[] | null;
  pedido_itens: {
    id: string;
    quantidade: number;
    subtotal: number;
    produtos: {
      nome: string;
    } | { nome: string }[] | null;
  }[];
};

async function carregarDadosPedidos() {
  if (!hasSupabaseEnv()) {
    return {
      clientes: [] as Cliente[],
      produtos: [] as Produto[],
      pedidos: [] as PedidoLista[],
      erro: "",
    };
  }

  const supabase = getSupabaseClient();

  const [clientesResp, produtosResp, pedidosResp] = await Promise.all([
    supabase.from("clientes").select("id, nome").order("nome", { ascending: true }),
    supabase
      .from("produtos")
      .select("id, nome, preco, estoque_atual")
      .order("nome", { ascending: true }),
    supabase
      .from("pedidos")
      .select(
        "id, total, created_at, clientes(nome), pedido_itens(id, quantidade, subtotal, produtos(nome))",
      )
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const erro =
    clientesResp.error?.message || produtosResp.error?.message || pedidosResp.error?.message || "";

  return {
    clientes: (clientesResp.data ?? []) as Cliente[],
    produtos: (produtosResp.data ?? []) as Produto[],
    pedidos: (pedidosResp.data ?? []) as PedidoLista[],
    erro,
  };
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

function extrairNomeRelacao(
  relacao: { nome: string } | { nome: string }[] | null | undefined,
  fallback: string,
) {
  if (!relacao) return fallback;
  if (Array.isArray(relacao)) return relacao[0]?.nome ?? fallback;
  return relacao.nome ?? fallback;
}

export default async function PedidosPage() {
  const { clientes, produtos, pedidos, erro } = await carregarDadosPedidos();

  return (
    <section className="space-y-6">
      <header>
        <p className="text-sm text-foreground/70">Operacao</p>
        <h1 className="text-2xl font-semibold">Pedidos</h1>
      </header>

      {!hasSupabaseEnv() ? (
        <article className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Configure as variaveis `NEXT_PUBLIC_SUPABASE_URL` e
          `NEXT_PUBLIC_SUPABASE_ANON_KEY` no arquivo `.env.local` para habilitar os
          pedidos.
        </article>
      ) : null}

      {erro ? (
        <article className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Nao foi possivel carregar pedidos: {erro}. Execute o SQL de
          `supabase/schema.sql` no Supabase e recarregue a pagina.
        </article>
      ) : null}

      <PedidoForm clientes={clientes} produtos={produtos} />

      <article className="rounded-xl border border-black/10 bg-surface p-4">
        <h2 className="text-lg font-medium">Ultimos pedidos</h2>

        {pedidos.length === 0 ? (
          <p className="mt-3 text-sm text-foreground/70">Nenhum pedido criado ainda.</p>
        ) : (
          <div className="mt-3 space-y-3">
            {pedidos.map((pedido) => (
              <div key={pedido.id} className="rounded-lg border border-black/10 p-3">
                <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                  <p className="text-sm font-medium">
                    Cliente: {extrairNomeRelacao(pedido.clientes, "Cliente nao encontrado")}
                  </p>
                  <p className="text-sm text-foreground/70">{formatarData(pedido.created_at)}</p>
                </div>
                <p className="mt-1 text-sm">
                  Total: <span className="font-semibold text-primary">{formatarMoeda(pedido.total)}</span>
                </p>
                <ul className="mt-2 space-y-1 text-sm text-foreground/80">
                  {pedido.pedido_itens.map((item) => (
                    <li key={item.id}>
                      {extrairNomeRelacao(item.produtos, "Produto")} - {item.quantidade} un. (
                      {formatarMoeda(item.subtotal)})
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </article>
    </section>
  );
}
