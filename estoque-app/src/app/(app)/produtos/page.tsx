import { getSupabaseClient, hasSupabaseEnv } from "@/lib/supabase";
import { ProdutoForm } from "./produto-form";

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

export default async function ProdutosPage() {
  const { produtos, erro } = await listarProdutos();

  return (
    <section className="space-y-6">
      <header>
        <p className="text-sm text-foreground/70">Cadastro</p>
        <h1 className="text-2xl font-semibold">Produtos</h1>
      </header>

      {!hasSupabaseEnv() ? (
        <article className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Configure as variaveis `NEXT_PUBLIC_SUPABASE_URL` e
          `NEXT_PUBLIC_SUPABASE_ANON_KEY` no arquivo `.env.local` para habilitar o
          cadastro de produtos.
        </article>
      ) : null}

      <ProdutoForm />

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
              </tr>
            </thead>
            <tbody>
              {produtos.map((produto) => (
                <tr key={produto.id} className="border-b border-black/5">
                  <td className="px-2 py-2">{produto.nome}</td>
                  <td className="px-2 py-2">{formatarPreco(produto.preco)}</td>
                  <td className="px-2 py-2">{produto.estoque_atual}</td>
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
