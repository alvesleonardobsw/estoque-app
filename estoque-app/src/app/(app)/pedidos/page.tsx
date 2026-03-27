import { getSupabaseClient, hasSupabaseEnv } from "@/lib/supabase";
import { PedidoForm } from "./pedido-form";
import { atualizarPedido, excluirPedido } from "./actions";

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
    id: string;
    nome: string;
  } | { id: string; nome: string }[] | null;
  pedido_itens: {
    id: string;
    produto_id: string;
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
        "id, total, created_at, clientes(id, nome), pedido_itens(id, produto_id, quantidade, subtotal, produtos(nome))",
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

function extrairClienteId(
  relacao: { id: string; nome: string } | { id: string; nome: string }[] | null | undefined,
) {
  if (!relacao) return "";
  if (Array.isArray(relacao)) return relacao[0]?.id ?? "";
  return relacao.id ?? "";
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
                <form action={atualizarPedido} className="mt-3 space-y-2 rounded-lg border border-black/10 p-3">
                  <input type="hidden" name="pedido_id" value={pedido.id} />

                  <label className="flex flex-col gap-1 text-xs">
                    Cliente do pedido
                    <select
                      name="cliente_id"
                      defaultValue={extrairClienteId(pedido.clientes)}
                      className="rounded-md border border-black/15 bg-white px-2 py-1 text-sm"
                    >
                      {clientes.map((cliente) => (
                        <option key={cliente.id} value={cliente.id}>
                          {cliente.nome}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="space-y-2">
                    {pedido.pedido_itens.map((item) => (
                      <div key={item.id} className="grid gap-2 md:grid-cols-[1fr_120px]">
                        <div className="rounded-md bg-background px-2 py-1 text-sm">
                          {extrairNomeRelacao(item.produtos, "Produto")}
                        </div>
                        <div>
                          <input type="hidden" name="produto_id" value={item.produto_id} />
                          <input
                            name="quantidade"
                            type="number"
                            min="1"
                            step="1"
                            defaultValue={item.quantidade}
                            className="w-full rounded-md border border-black/15 bg-white px-2 py-1 text-sm"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="rounded-md border border-black/20 px-2 py-1 text-xs"
                    >
                      Salvar alteracoes
                    </button>
                  </div>
                </form>

                <form action={excluirPedido} className="mt-2">
                  <input type="hidden" name="pedido_id" value={pedido.id} />
                  <button
                    type="submit"
                    className="rounded-md border border-red-300 bg-red-50 px-2 py-1 text-xs text-red-700"
                  >
                    Excluir pedido
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </article>
    </section>
  );
}
