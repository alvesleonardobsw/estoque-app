import { getSupabaseClient, hasSupabaseEnv } from "@/lib/supabase";
import { ProdutoForm } from "./produto-form";
import { excluirProduto } from "./actions";
import Link from "next/link";
import { EditIcon, TrashIcon } from "@/components/action-icons";

type Produto = {
  id: string;
  nome: string;
  preco: number;
  estoque_atual: number;
};

async function listarProdutos() {
  if (!hasSupabaseEnv()) {
    return { produtos: [] as Produto[], erro: "" };
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("produtos")
    .select("id, nome, preco, estoque_atual")
    .order("created_at", { ascending: false });

  if (error) {
    return { produtos: [] as Produto[], erro: error.message };
  }

  return { produtos: (data ?? []) as Produto[], erro: "" };
}

function formatarPreco(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

type PageProps = {
  searchParams: Promise<{ editar?: string; novo?: string }>;
};

export default async function ProdutosPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const editarId = typeof params.editar === "string" ? params.editar : "";
  const novo = typeof params.novo === "string" ? params.novo : "";
  const { produtos, erro } = await listarProdutos();
  const produtoEdicao = produtos.find((produto) => produto.id === editarId) ?? null;
  const mostrarFormulario = Boolean(produtoEdicao) || novo === "1";

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
        <p className="text-sm text-foreground/70">Cadastro</p>
        <h1 className="text-2xl font-semibold">Produtos</h1>
        </div>
        {!mostrarFormulario ? (
          <Link
            href="/produtos?novo=1"
            className="inline-block rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-contrast"
          >
            Cadastrar produto
          </Link>
        ) : null}
      </header>

      {!hasSupabaseEnv() ? (
        <article className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Configure as variaveis `NEXT_PUBLIC_SUPABASE_URL` e
          `NEXT_PUBLIC_SUPABASE_ANON_KEY` no arquivo `.env.local` para habilitar o
          cadastro de produtos.
        </article>
      ) : null}

      {mostrarFormulario ? (
        <ProdutoForm
          key={produtoEdicao?.id ?? "novo"}
          produtoEdicao={produtoEdicao}
          mostrarCancelarNovo={!produtoEdicao}
        />
      ) : null}

      {erro ? (
        <article className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Nao foi possivel carregar produtos ainda: {erro}. Execute o SQL de
          `supabase/schema.sql` no Supabase e recarregue a pagina.
        </article>
      ) : null}

      <article className="rounded-xl border border-black/10 bg-surface p-4">
        <h2 className="text-lg font-medium">Produtos cadastrados</h2>

        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-black/10 text-foreground/70">
                <th className="px-2 py-2 font-medium">Nome</th>
                <th className="px-2 py-2 font-medium">Preco</th>
                <th className="px-2 py-2 font-medium">Estoque atual</th>
                <th className="px-2 py-2 font-medium">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {produtos.map((produto) => (
                <tr
                  key={produto.id}
                  className={`border-b border-black/5 ${
                    produto.estoque_atual === 0 ? "bg-red-50" : ""
                  }`}
                >
                  <td className="px-2 py-2">{produto.nome}</td>
                  <td className="px-2 py-2">{formatarPreco(produto.preco)}</td>
                  <td className="px-2 py-2">{produto.estoque_atual}</td>
                  <td className="px-2 py-2">
                    <div className="flex gap-2">
                      <Link
                        href={`/produtos?editar=${produto.id}`}
                        className="rounded-md border border-black/20 p-2 text-xs"
                        aria-label="Editar produto"
                        title="Editar produto"
                      >
                        <EditIcon />
                      </Link>

                      <form action={excluirProduto}>
                        <input type="hidden" name="id" value={produto.id} />
                        <button
                          type="submit"
                          className="rounded-md border border-red-300 bg-red-50 p-2 text-xs text-red-700"
                          aria-label="Excluir produto"
                          title="Excluir produto"
                        >
                          <TrashIcon />
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {produtos.length === 0 ? (
          <p className="mt-3 text-sm text-foreground/70">Nenhum produto cadastrado ainda.</p>
        ) : null}
      </article>
    </section>
  );
}
