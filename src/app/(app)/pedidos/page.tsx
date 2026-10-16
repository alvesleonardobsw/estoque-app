import { getSupabaseClient, hasSupabaseEnv, mensagemErro } from "@/lib/supabase";
import { requireSession } from "@/lib/auth";
import { PedidoForm } from "./pedido-form";
import { atualizarStatusPedido, excluirPedido } from "./actions";
import Link from "next/link";
import { ConfirmDeletePedidoButton } from "./confirm-delete-button";
import { FormaPagamentoButton } from "./forma-pagamento-button";
import { CheckCircleIcon, EditIcon, PrintIcon, UndoIcon } from "@/components/action-icons";
import { rotuloFormaPagamento } from "@/lib/forma-pagamento";
import { formatarNumeroPedido } from "@/lib/numero-pedido";
import { formatarData, formatarDataCurta } from "@/lib/datas";
import {
  faltasDosPendentes,
  reservadoPorProduto,
  somarPorProduto,
  type Disponibilidade,
  type PedidoPendente,
  type ProdutoEstoque,
} from "@/lib/estoque";

type Cliente = {
  id: string;
  nome: string;
};

type Produto = {
  id: string;
  nome: string;
  sabor: "frango" | "carne" | "palmito" | "calabresa" | "camarao";
  preco: number;
  preco_variavel: boolean;
  estoque_atual: number;
};

type PedidoLista = {
  id: string;
  numero: number;
  cliente_id: string;
  status: "pendente" | "entregue";
  data_entrega_prevista: string | null;
  data_entrega: string | null;
  forma_pagamento: string | null;
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
    preco_unitario: number;
    subtotal: number;
    produtos: {
      nome: string;
    } | { nome: string }[] | null;
  }[];
};

type Relacao<T> = T | T[] | null;

type PendenteBanco = {
  id: string;
  created_at: string;
  data_entrega_prevista: string | null;
  pedido_itens: {
    produto_id: string;
    quantidade: number;
    produtos: Relacao<ProdutoEstoque>;
  }[];
};

function primeiro<T>(relacao: Relacao<T>) {
  return Array.isArray(relacao) ? (relacao[0] ?? null) : relacao;
}

// Todos os pendentes (nao so os 10 da lista), para saber o que esta reservado e o que falta.
function montarPendentes(linhas: PendenteBanco[]) {
  const pendentes: PedidoPendente[] = [];
  const produtosEstoque = new Map<string, ProdutoEstoque>();
  for (const linha of linhas) {
    pendentes.push({
      id: linha.id,
      created_at: linha.created_at,
      data_entrega_prevista: linha.data_entrega_prevista,
      itens: linha.pedido_itens.map((item) => ({ produto_id: item.produto_id, quantidade: item.quantidade })),
    });
    for (const item of linha.pedido_itens) {
      const produto = primeiro(item.produtos);
      if (produto) produtosEstoque.set(item.produto_id, produto);
    }
  }
  return { pendentes, produtosEstoque };
}

async function carregarDadosPedidos(tenantId: string, statusFiltro: "todos" | "pendente" | "entregue") {
  if (!hasSupabaseEnv()) {
    return {
      clientes: [] as Cliente[],
      produtos: [] as Produto[],
      pedidos: [] as PedidoLista[],
      pendentes: [] as PendenteBanco[],
      erro: "",
    };
  }

  const supabase = getSupabaseClient();

  let pedidosQuery = supabase
    .from("pedidos")
    .select(
      "id, numero, cliente_id, status, data_entrega_prevista, data_entrega, forma_pagamento, total, created_at, clientes(id, nome), pedido_itens(id, produto_id, quantidade, preco_unitario, subtotal, produtos(nome))",
    )
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (statusFiltro !== "todos") {
    pedidosQuery = pedidosQuery.eq("status", statusFiltro);
  }

  const [clientesResp, produtosResp, pedidosResp, pendentesResp] = await Promise.all([
    supabase.from("clientes").select("id, nome").eq("tenant_id", tenantId).order("nome", { ascending: true }),
    supabase
      .from("produtos")
      .select("id, nome, sabor, preco, preco_variavel, estoque_atual")
      .eq("tenant_id", tenantId)
      .eq("ativo", true)
      .order("nome", { ascending: true }),
    pedidosQuery,
    supabase
      .from("pedidos")
      .select(
        "id, created_at, data_entrega_prevista, pedido_itens(produto_id, quantidade, produtos(nome, estoque_atual, preco_variavel))",
      )
      .eq("tenant_id", tenantId)
      .eq("status", "pendente"),
  ]);

  const erro = mensagemErro(clientesResp.error, produtosResp.error, pedidosResp.error, pendentesResp.error);

  return {
    clientes: (clientesResp.data ?? []) as Cliente[],
    produtos: (produtosResp.data ?? []) as Produto[],
    pedidos: (pedidosResp.data ?? []) as PedidoLista[],
    pendentes: (pendentesResp.data ?? []) as PendenteBanco[],
    erro,
  };
}

function formatarMoeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
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
  const sessao = await requireSession();
  const params = await searchParams;
  const editarId = typeof params.editar === "string" ? params.editar : "";
  const novo = typeof params.novo === "string" ? params.novo : "";
  const statusFiltro =
    params.status === "pendente" || params.status === "entregue" ? params.status : "todos";
  const { clientes, produtos, pedidos, pendentes: pendentesBanco, erro } = await carregarDadosPedidos(
    sessao.tenantId,
    statusFiltro,
  );
  const pedidoEdicao = pedidos.find((pedido) => pedido.id === editarId);
  const mostrarFormulario = Boolean(pedidoEdicao) || novo === "1";

  const { pendentes, produtosEstoque } = montarPendentes(pendentesBanco);
  const { porPedido: faltasPorPedido, aProduzir } = faltasDosPendentes(pendentes, produtosEstoque);

  // No formulario, o disponivel desconta os outros pendentes. Se o pedido editado ja foi
  // entregue, o que ele baixou volta para a conta.
  const reservado = reservadoPorProduto(pendentes, pedidoEdicao?.id);
  const jaBaixado =
    pedidoEdicao?.status === "entregue" ? somarPorProduto(pedidoEdicao.pedido_itens) : new Map<string, number>();
  const disponibilidade: Record<string, Disponibilidade> = Object.fromEntries(
    produtos
      .filter((produto) => !produto.preco_variavel)
      .map((produto) => [
        produto.id,
        {
          estoque: produto.estoque_atual + (jaBaixado.get(produto.id) ?? 0),
          reservado: reservado.get(produto.id) ?? 0,
        },
      ]),
  );

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
          Configure as variaveis `SUPABASE_URL` e
          `SUPABASE_SERVICE_ROLE_KEY` no arquivo `.env.local` para habilitar os
          pedidos.
        </article>
      ) : null}

      {erro ? (
        <article className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Nao foi possivel carregar pedidos: {erro}
        </article>
      ) : null}

      {mostrarFormulario ? (
        <PedidoForm
          key={pedidoEdicao?.id ?? "novo"}
          clientes={clientes}
          produtos={produtos}
          disponibilidade={disponibilidade}
          pedidoEdicao={
            pedidoEdicao
              ? {
                  id: pedidoEdicao.id,
                  cliente_id: pedidoEdicao.cliente_id,
                  data_entrega_prevista: pedidoEdicao.data_entrega_prevista,
                  itens: pedidoEdicao.pedido_itens.map((item) => ({
                    produto_id: item.produto_id,
                    quantidade: item.quantidade,
                    preco_unitario: item.preco_unitario,
                  })),
                }
              : null
          }
          mostrarCancelarNovo={!pedidoEdicao}
        />
      ) : null}

      {aProduzir.length > 0 ? (
        <article className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <h2 className="font-medium">Falta estoque para os pedidos pendentes</h2>
          <p className="mt-1 text-xs">Para entregar todos, ainda falta produzir:</p>
          <ul className="mt-2 space-y-1">
            {aProduzir.map((item) => (
              <li key={item.produto_id}>
                {item.nome}: <span className="font-semibold">{item.falta} un.</span>
              </li>
            ))}
          </ul>
        </article>
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
                    <span className="text-foreground/70">#{formatarNumeroPedido(pedido.numero)}</span> · Cliente:{" "}
                    {extrairNomeRelacao(pedido.clientes, "Cliente nao encontrado")}
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
                {pedido.forma_pagamento ? (
                  <p className="mt-1 text-xs text-foreground/70">
                    Pagamento: {rotuloFormaPagamento(pedido.forma_pagamento)}
                  </p>
                ) : null}
                {pedido.data_entrega_prevista ? (
                  <p className="mt-1 text-xs text-foreground/70">
                    Entrega prevista: {formatarDataCurta(pedido.data_entrega_prevista)}
                  </p>
                ) : null}
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
                {pedido.status === "pendente" && faltasPorPedido.has(pedido.id) ? (
                  <p className="mt-2 rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-900">
                    Sem estoque para entregar:{" "}
                    {faltasPorPedido
                      .get(pedido.id)
                      ?.map((falta) => `${falta.nome} (faltam ${falta.falta})`)
                      .join(", ")}
                  </p>
                ) : null}

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
                    <FormaPagamentoButton pedidoId={pedido.id} formaPagamento={pedido.forma_pagamento} />
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
