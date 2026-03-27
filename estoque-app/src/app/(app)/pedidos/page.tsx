import { getSupabaseClient, hasSupabaseEnv } from "@/lib/supabase";
import { PedidoForm } from "./pedido-form";
import { atualizarStatusPedido, excluirPedido } from "./actions";
import Link from "next/link";
import { ConfirmDeletePedidoButton } from "./confirm-delete-button";
import { CheckCircleIcon, EditIcon, PrintIcon, UndoIcon } from "@/components/action-icons";

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
  cliente_id: string;
  status: "pendente" | "entregue";
  data_entrega: string | null;
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

async function carregarDadosPedidos(statusFiltro: "todos" | "pendente" | "entregue") {
  if (!hasSupabaseEnv()) {
    return {
      clientes: [] as Cliente[],
      produtos: [] as Produto[],
      pedidos: [] as PedidoLista[],
      erro: "",
    };
  }

  const supabase = getSupabaseClient();

  let pedidosQuery = supabase
    .from("pedidos")
    .select(
      "id, cliente_id, status, data_entrega, total, created_at, clientes(id, nome), pedido_itens(id, produto_id, quantidade, subtotal, produtos(nome))",
    )
    .order("created_at", { ascending: false })
    .limit(10);

  if (statusFiltro !== "todos") {
    pedidosQuery = pedidosQuery.eq("status", statusFiltro);
  }

  const [clientesResp, produtosResp, pedidosResp] = await Promise.all([
    supabase.from("clientes").select("id, nome").order("nome", { ascending: true }),
    supabase
      .from("produtos")
      .select("id, nome, preco, estoque_atual")
      .order("nome", { ascending: true }),
    pedidosQuery,
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

type PageProps = {
  searchParams: Promise<{ editar?: string; novo?: string; status?: string }>;
};

export default async function PedidosPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const editarId = typeof params.editar === "string" ? params.editar : "";
  const novo = typeof params.novo === "string" ? params.novo : "";
  const statusFiltro =
    params.status === "pendente" || params.status === "entregue" ? params.status : "todos";
  const { clientes, produtos, pedidos, erro } = await carregarDadosPedidos(statusFiltro);
  const pedidoEdicao = pedidos.find((pedido) => pedido.id === editarId);
  const mostrarFormulario = Boolean(pedidoEdicao) || novo === "1";

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-foreground/70">Operacao</p>
          <h1 className="text-2xl font-semibold">Pedidos</h1>
        </div>
        {!mostrarFormulario ? (
          <Link
            href="/pedidos?novo=1"
            className="inline-block rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-contrast"
          >
            Criar pedido
          </Link>
        ) : null}
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

      {mostrarFormulario ? (
        <PedidoForm
          key={pedidoEdicao?.id ?? "novo"}
          clientes={clientes}
          produtos={produtos}
          pedidoEdicao={
            pedidoEdicao
              ? {
                  id: pedidoEdicao.id,
                  cliente_id: pedidoEdicao.cliente_id,
                  itens: pedidoEdicao.pedido_itens.map((item) => ({
                    produto_id: item.produto_id,
                    quantidade: item.quantidade,
                  })),
                }
              : null
          }
          mostrarCancelarNovo={!pedidoEdicao}
        />
      ) : null}

      <article className="rounded-xl border border-black/10 bg-surface p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-medium">Ultimos pedidos</h2>
          <div className="flex gap-2 text-xs">
            <Link
              href="/pedidos?status=todos"
              className={`rounded-md border px-2 py-1 ${
                statusFiltro === "todos" ? "border-primary bg-primary text-primary-contrast" : "border-black/20"
              }`}
            >
              Todos
            </Link>
            <Link
              href="/pedidos?status=pendente"
              className={`rounded-md border px-2 py-1 ${
                statusFiltro === "pendente" ? "border-primary bg-primary text-primary-contrast" : "border-black/20"
              }`}
            >
              Pendentes
            </Link>
            <Link
              href="/pedidos?status=entregue"
              className={`rounded-md border px-2 py-1 ${
                statusFiltro === "entregue" ? "border-primary bg-primary text-primary-contrast" : "border-black/20"
              }`}
            >
              Entregues
            </Link>
          </div>
        </div>

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
                <p className="mt-1">
                  <span
                    className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                      pedido.status === "entregue"
                        ? "bg-green-100 text-green-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {pedido.status === "entregue" ? "Entregue" : "Pendente"}
                  </span>
                </p>
                <p className="mt-1 text-sm">
                  Total: <span className="font-semibold text-primary">{formatarMoeda(pedido.total)}</span>
                </p>
                {pedido.data_entrega ? (
                  <p className="mt-1 text-xs text-foreground/70">
                    Entregue em: {formatarData(pedido.data_entrega)}
                  </p>
                ) : null}
                <ul className="mt-2 space-y-1 text-sm text-foreground/80">
                  {pedido.pedido_itens.map((item) => (
                    <li key={item.id}>
                      {extrairNomeRelacao(item.produtos, "Produto")} - {item.quantidade} un. (
                      {formatarMoeda(item.subtotal)})
                    </li>
                  ))}
                </ul>

                <div className="mt-3 flex items-center justify-between">
                  <div className="flex gap-2">
                    <form action={atualizarStatusPedido}>
                      <input type="hidden" name="pedido_id" value={pedido.id} />
                      <input
                        type="hidden"
                        name="status"
                        value={pedido.status === "entregue" ? "pendente" : "entregue"}
                      />
                    <button
                      type="submit"
                      className="rounded-md border border-black/20 p-2 text-xs"
                      aria-label={
                        pedido.status === "entregue" ? "Marcar pedido como pendente" : "Marcar pedido como entregue"
                      }
                      title={
                        pedido.status === "entregue" ? "Marcar como pendente" : "Marcar como entregue"
                      }
                    >
                      {pedido.status === "entregue" ? <UndoIcon /> : <CheckCircleIcon />}
                    </button>
                  </form>
                    <Link
                      href={`/pedidos?editar=${pedido.id}`}
                      className="rounded-md border border-black/20 p-2 text-xs"
                      aria-label="Editar pedido"
                      title="Editar pedido"
                    >
                      <EditIcon />
                    </Link>
                    <form id={`excluir-pedido-${pedido.id}`} action={excluirPedido}>
                      <input type="hidden" name="pedido_id" value={pedido.id} />
                    </form>
                    <ConfirmDeletePedidoButton formId={`excluir-pedido-${pedido.id}`} />
                  </div>

                  <Link
                    href={`/imprimir/pedidos/${pedido.id}`}
                    target="_blank"
                    className="rounded-md border border-black/20 p-2 text-xs"
                    aria-label="Imprimir pedido"
                    title="Imprimir pedido"
                  >
                    <PrintIcon />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </article>
    </section>
  );
}
