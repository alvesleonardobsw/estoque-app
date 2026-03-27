import { getSupabaseClient, hasSupabaseEnv } from "@/lib/supabase";
import { PedidoForm } from "./pedido-form";
import { excluirPedido } from "./actions";
import Link from "next/link";
import { ConfirmDeletePedidoButton } from "./confirm-delete-button";
import { EditIcon } from "@/components/action-icons";

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
        "id, cliente_id, total, created_at, clientes(id, nome), pedido_itens(id, produto_id, quantidade, subtotal, produtos(nome))",
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

type PageProps = {
  searchParams: Promise<{ editar?: string; novo?: string }>;
};

export default async function PedidosPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const editarId = typeof params.editar === "string" ? params.editar : "";
  const novo = typeof params.novo === "string" ? params.novo : "";
  const { clientes, produtos, pedidos, erro } = await carregarDadosPedidos();
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

                <div className="mt-3 flex gap-2">
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
              </div>
            ))}
          </div>
        )}
      </article>
    </section>
  );
}
