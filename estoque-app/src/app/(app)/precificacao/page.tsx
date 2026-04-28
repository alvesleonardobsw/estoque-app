import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { getSupabaseClient, hasSupabaseEnv } from "@/lib/supabase";
import { PrecificacaoForm } from "./precificacao-form";
import {
  excluirIngredienteBasePrecificacao,
  excluirProdutoPrecificacao,
  salvarCustoBasePrecificacao,
} from "./actions";
import { EditIcon, TrashIcon } from "@/components/action-icons";

type IngredienteLista = {
  id: string;
  nome: string;
  quantidade: string;
  custo: number;
};

type IngredienteBaseLista = {
  id: string;
  nome: string;
  unidade_padrao: string | null;
  custo_padrao: number;
};

type ProdutoPrecificacao = {
  id: string;
  nome: string;
  preco_venda: number | null;
  created_at: string;
  precificacao_ingredientes: IngredienteLista[] | IngredienteLista | null;
};

type PageProps = {
  searchParams: Promise<{ editar?: string; novo?: string; novoIngrediente?: string; erro?: string; sucesso?: string }>;
};

function formatarMoeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

function calcularCustoTotal(ingredientes: IngredienteLista[]) {
  return ingredientes.reduce((acc, item) => acc + Number(item.custo ?? 0), 0);
}

function calcularMargem(custoTotal: number, precoVenda: number | null) {
  if (precoVenda === null || custoTotal <= 0) return null;
  return ((precoVenda - custoTotal) / custoTotal) * 100;
}

function normalizarIngredientes(relacao: ProdutoPrecificacao["precificacao_ingredientes"]): IngredienteLista[] {
  if (!relacao) return [];
  if (Array.isArray(relacao)) return relacao;
  return [relacao];
}

async function listarProdutosPrecificacao(tenantId: string) {
  if (!hasSupabaseEnv()) {
    return { produtos: [] as ProdutoPrecificacao[], erro: "" };
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("precificacao_produtos")
    .select("id, nome, preco_venda, created_at, precificacao_ingredientes(id, nome, quantidade, custo)")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (error) {
    return { produtos: [] as ProdutoPrecificacao[], erro: error.message };
  }

  return { produtos: (data ?? []) as ProdutoPrecificacao[], erro: "" };
}

async function listarIngredientesBase(tenantId: string) {
  if (!hasSupabaseEnv()) {
    return { itens: [] as IngredienteBaseLista[], erro: "" };
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("precificacao_custos_base")
    .select("id, nome, unidade_padrao, custo_padrao")
    .eq("tenant_id", tenantId)
    .eq("tipo", "ingrediente")
    .order("nome", { ascending: true });

  if (error) {
    return { itens: [] as IngredienteBaseLista[], erro: error.message };
  }

  return { itens: (data ?? []) as IngredienteBaseLista[], erro: "" };
}

export default async function PrecificacaoPage({ searchParams }: PageProps) {
  const sessao = await requireSession();
  const params = await searchParams;
  const editarId = typeof params.editar === "string" ? params.editar : "";
  const novo = typeof params.novo === "string" ? params.novo : "";
  const novoIngrediente = typeof params.novoIngrediente === "string" ? params.novoIngrediente : "";
  const erroAcao = typeof params.erro === "string" ? params.erro : "";
  const sucessoAcao = typeof params.sucesso === "string" ? params.sucesso : "";

  const [{ produtos, erro }, { itens: ingredientesBase, erro: erroIngredientesBase }] = await Promise.all([
    listarProdutosPrecificacao(sessao.tenantId),
    listarIngredientesBase(sessao.tenantId),
  ]);

  const produtoEdicao = produtos.find((item) => item.id === editarId) ?? null;
  const mostrarFormularioProduto = Boolean(produtoEdicao) || novo === "1";
  const mostrarFormularioIngrediente = novoIngrediente === "1";

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-foreground/70">Gestao de custos</p>
          <h1 className="text-2xl font-semibold">Precificacao</h1>
        </div>
        {!mostrarFormularioProduto && !mostrarFormularioIngrediente ? (
          <div className="flex gap-2">
            <Link
              href="/precificacao?novo=1"
              className="inline-block rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-contrast"
            >
              Novo produto
            </Link>
            <Link
              href="/precificacao?novoIngrediente=1"
              className="inline-block rounded-lg border border-black/20 px-4 py-2 text-sm font-medium"
            >
              Novo ingrediente
            </Link>
          </div>
        ) : null}
      </header>

      {!hasSupabaseEnv() ? (
        <article className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Configure as variaveis `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` no arquivo `.env.local`.
        </article>
      ) : null}

      {erro ? (
        <article className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Nao foi possivel carregar precificacao: {erro}. Execute o SQL de `supabase/schema.sql`.
        </article>
      ) : null}

      {erroIngredientesBase ? (
        <article className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Nao foi possivel carregar ingredientes base: {erroIngredientesBase}.
        </article>
      ) : null}

      {sucessoAcao === "excluido" ? (
        <article className="rounded-xl border border-green-300 bg-green-50 p-4 text-sm text-green-800">
          Produto de precificacao excluido com sucesso.
        </article>
      ) : null}

      {sucessoAcao === "custo-base" ? (
        <article className="rounded-xl border border-green-300 bg-green-50 p-4 text-sm text-green-800">
          Ingrediente cadastrado com sucesso.
        </article>
      ) : null}

      {sucessoAcao === "ingrediente-excluido" ? (
        <article className="rounded-xl border border-green-300 bg-green-50 p-4 text-sm text-green-800">
          Ingrediente excluido com sucesso.
        </article>
      ) : null}

      {erroAcao === "exclusao" ? (
        <article className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          Nao foi possivel excluir o produto de precificacao.
        </article>
      ) : null}

      {erroAcao === "custo-base" ? (
        <article className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          Nao foi possivel cadastrar o ingrediente.
        </article>
      ) : null}

      {erroAcao === "ingrediente-exclusao" ? (
        <article className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          Nao foi possivel excluir o ingrediente.
        </article>
      ) : null}

      {mostrarFormularioIngrediente ? (
        <article className="rounded-xl border border-black/10 bg-surface p-4">
          <h2 className="text-lg font-medium">Novo ingrediente</h2>
          <form action={salvarCustoBasePrecificacao} className="mt-3 grid gap-2 md:grid-cols-[minmax(160px,1fr)_180px_130px_auto]">
            <label className="flex flex-col gap-1 text-sm">
              Nome
              <input
                name="nome"
                required
                className="rounded-lg border border-black/15 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring"
                placeholder="Ex.: Chocolate meio amargo"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Unidade padrao
              <input
                name="unidade_padrao"
                className="rounded-lg border border-black/15 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring"
                placeholder="Ex.: 200g"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Custo padrao (R$)
              <input
                type="number"
                min={0}
                step="0.01"
                required
                name="custo_padrao"
                className="rounded-lg border border-black/15 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring"
              />
            </label>
            <button
              type="submit"
              className="self-end rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-contrast"
            >
              Cadastrar
            </button>
          </form>

          <Link href="/precificacao" className="mt-3 inline-block rounded-lg border border-black/20 px-4 py-2 text-sm font-medium">
            Cancelar
          </Link>
        </article>
      ) : null}

      {mostrarFormularioProduto ? (
        <PrecificacaoForm
          key={produtoEdicao?.id ?? "novo"}
          ingredientesBase={ingredientesBase}
          produtoEdicao={
            produtoEdicao
              ? {
                  id: produtoEdicao.id,
                  nome: produtoEdicao.nome,
                  preco_venda: produtoEdicao.preco_venda,
                  ingredientes: normalizarIngredientes(produtoEdicao.precificacao_ingredientes).map((item) => ({
                    nome: item.nome,
                    quantidade: item.quantidade,
                    custo: item.custo,
                  })),
                }
              : null
          }
          mostrarCancelarNovo={!produtoEdicao}
        />
      ) : null}

      <article className="rounded-xl border border-black/10 bg-surface p-4">
        <h2 className="text-lg font-medium">Ingredientes cadastrados</h2>
        {ingredientesBase.length === 0 ? (
          <p className="mt-3 text-sm text-foreground/70">Nenhum ingrediente cadastrado ainda.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-black/10 text-foreground/70">
                  <th className="px-2 py-2 font-medium">Nome</th>
                  <th className="px-2 py-2 font-medium">Unidade</th>
                  <th className="px-2 py-2 font-medium">Custo padrao</th>
                  <th className="px-2 py-2 font-medium">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {ingredientesBase.map((item) => (
                  <tr key={item.id} className="border-b border-black/5">
                    <td className="px-2 py-2">{item.nome}</td>
                    <td className="px-2 py-2">{item.unidade_padrao || "-"}</td>
                    <td className="px-2 py-2">{formatarMoeda(item.custo_padrao)}</td>
                    <td className="px-2 py-2">
                      <form action={excluirIngredienteBasePrecificacao}>
                        <input type="hidden" name="id" value={item.id} />
                        <button
                          type="submit"
                          className="rounded-md border border-black/20 p-2 text-xs"
                          aria-label="Excluir ingrediente"
                          title="Excluir ingrediente"
                        >
                          <TrashIcon />
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>

      <article className="rounded-xl border border-black/10 bg-surface p-4">
        <h2 className="text-lg font-medium">Produtos precificados</h2>

        {produtos.length === 0 ? (
          <p className="mt-3 text-sm text-foreground/70">Nenhum produto precificado ainda.</p>
        ) : (
          <div className="mt-3 space-y-3">
            {produtos.map((produto) => {
              const ingredientes = normalizarIngredientes(produto.precificacao_ingredientes);
              const custoTotal = calcularCustoTotal(ingredientes);
              const margem = calcularMargem(custoTotal, produto.preco_venda);

              return (
                <div key={produto.id} className="rounded-lg border border-black/10 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <Link href={`/precificacao?editar=${produto.id}`} className="flex-1 transition hover:text-primary">
                      <p className="font-medium">{produto.nome}</p>
                      <p className="mt-1 text-sm text-foreground/80">
                        Custo total: <span className="font-semibold">{formatarMoeda(custoTotal)}</span>
                      </p>
                      <p className="text-sm text-foreground/80">
                        Preco de venda:{" "}
                        <span className="font-semibold">
                          {produto.preco_venda === null ? "Nao definido" : formatarMoeda(produto.preco_venda)}
                        </span>
                      </p>
                      {margem !== null ? (
                        <p className="text-sm">
                          Margem:{" "}
                          <span className={`font-semibold ${margem >= 0 ? "text-green-700" : "text-red-700"}`}>
                            {margem.toFixed(2)}%
                          </span>
                        </p>
                      ) : null}
                    </Link>

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/precificacao?editar=${produto.id}`}
                        className="rounded-md border border-black/20 p-2 text-xs"
                        aria-label="Editar produto de precificacao"
                        title="Editar produto de precificacao"
                      >
                        <EditIcon />
                      </Link>

                      <form action={excluirProdutoPrecificacao}>
                        <input type="hidden" name="id" value={produto.id} />
                        <button
                          type="submit"
                          className="rounded-md border border-black/20 p-2 text-xs"
                          aria-label="Excluir produto de precificacao"
                          title="Excluir produto de precificacao"
                        >
                          <TrashIcon />
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </article>
    </section>
  );
}
