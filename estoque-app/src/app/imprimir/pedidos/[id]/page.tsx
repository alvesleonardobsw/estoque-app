import { getSupabaseClient, hasSupabaseEnv } from "@/lib/supabase";
import { PrintControls } from "./print-controls";

type PedidoDetalhe = {
  id: string;
  created_at: string;
  data_entrega: string | null;
  total: number;
  clientes: { nome: string; endereco: string | null } | { nome: string; endereco: string | null }[] | null;
  pedido_itens: {
    id: string;
    quantidade: number;
    subtotal: number;
    produtos: { nome: string } | { nome: string }[] | null;
  }[];
};

type PageProps = {
  params: Promise<{ id: string }>;
};

function formatarData(dataIso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(dataIso));
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

function extrairEnderecoRelacao(
  relacao:
    | { nome: string; endereco: string | null }
    | { nome: string; endereco: string | null }[]
    | null
    | undefined,
  fallback: string,
) {
  if (!relacao) return fallback;
  if (Array.isArray(relacao)) return relacao[0]?.endereco ?? fallback;
  return relacao.endereco ?? fallback;
}

export default async function ImprimirPedidoPage({ params }: PageProps) {
  const { id } = await params;

  if (!hasSupabaseEnv()) {
    return <main className="p-4">Supabase nao configurado.</main>;
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("pedidos")
    .select(
      "id, created_at, data_entrega, total, clientes(nome, endereco), pedido_itens(id, quantidade, subtotal, produtos(nome))",
    )
    .eq("id", id)
    .single();

  if (error || !data) {
    return <main className="p-4">Pedido nao encontrado.</main>;
  }

  const pedido = data as PedidoDetalhe;

  return (
    <main className="mx-auto max-w-md p-4 text-sm text-black">
      <style>{`
        @media print {
          @page { size: 80mm auto; margin: 4mm; }
          body { background: white; }
        }
      `}</style>

      <PrintControls />

      <section className="rounded border border-black/20 p-3">
        <h1 className="text-center text-base font-semibold">Comanda do Pedido</h1>
        <p className="mt-1 text-center text-xs">Pedido #{pedido.id.slice(0, 8).toUpperCase()}</p>

        <hr className="my-3 border-dashed border-black/30" />

        <p>
          <strong>Cliente:</strong> {extrairNomeRelacao(pedido.clientes, "Nao informado")}
        </p>
        <p>
          <strong>Endereco:</strong> {extrairEnderecoRelacao(pedido.clientes, "Nao informado")}
        </p>
        <p>
          <strong>Criado em:</strong> {formatarData(pedido.created_at)}
        </p>
        {pedido.data_entrega ? (
          <p>
            <strong>Entregue em:</strong> {formatarData(pedido.data_entrega)}
          </p>
        ) : null}

        <hr className="my-3 border-dashed border-black/30" />

        <ul className="space-y-1">
          {pedido.pedido_itens.map((item) => (
            <li key={item.id} className="flex items-start justify-between gap-2">
              <span>
                {extrairNomeRelacao(item.produtos, "Produto")} x{item.quantidade}
              </span>
              <span>{formatarMoeda(item.subtotal)}</span>
            </li>
          ))}
        </ul>

        <hr className="my-3 border-dashed border-black/30" />

        <p className="flex items-center justify-between text-base font-semibold">
          <span>Total</span>
          <span>{formatarMoeda(pedido.total)}</span>
        </p>
      </section>
    </main>
  );
}
