import { getSupabaseClient, hasSupabaseEnv } from "@/lib/supabase";
import { requireSession } from "@/lib/auth";
import { ProdutoForm } from "./produto-form";
import Link from "next/link";
import { EditIcon } from "@/components/action-icons";

type Produto = {
  id: string;
  nome: string;
  sabor: "frango" | "carne" | "palmito" | "calabresa" | "camarao";
  preco: number;
  estoque_atual: number;
};

async function listarProdutos(tenantId: string) {
  if (!hasSupabaseEnv()) {
    return { produtos: [] as Produto[], erro: "" };
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("produtos")
    .select("id, nome, sabor, preco, estoque_atual")
    .eq("tenant_id", tenantId)
    .eq("ativo", true)
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
  searchParams: Promise<{
    editar?: string;
    novo?: string;
    erro?: string;
    sucesso?: string;
    sabor?: string;
    peso?: string;
  }>;
};

type Sabor = "frango" | "carne" | "palmito" | "calabresa" | "camarao";

function normalizarPeso(valor: string) {
  return valor.toLowerCase().replace(/\s+/g, "");
}

function normalizarTexto(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function inferirSaborDoNome(nomeProduto: string): Sabor | "" {
  const nome = normalizarTexto(nomeProduto);
  if (nome.includes("camarao")) return "camarao";
  if (nome.includes("calabresa")) return "calabresa";
  if (nome.includes("palmito")) return "palmito";
  if (nome.includes("carne")) return "carne";
  if (nome.includes("frango")) return "frango";
  return "";
}

function obterSaborEfetivo(produto: Produto): Sabor {
  const inferido = inferirSaborDoNome(produto.nome);
  if (produto.sabor !== "frango") return produto.sabor;
  if (inferido && inferido !== "frango") return inferido;
  return produto.sabor;
}

function extrairPesoDoNome(nome: string) {
  const match = nome.toLowerCase().match(/(\d+\s?(?:g|kg))/);
  return match ? normalizarPeso(match[1]) : "";
}

export default async function ProdutosPage({ searchParams }: PageProps) {
  const sessao = await requireSession();
  const params = await searchParams;
  const editarId = typeof params.editar === "string" ? params.editar : "";
  const novo = typeof params.novo === "string" ? params.novo : "";
  const erroAcao = typeof params.erro === "string" ? params.erro : "";
  const sucessoAcao = typeof params.sucesso === "string" ? params.sucesso : "";
  const saborFiltro =
    params.sabor === "frango" ||
    params.sabor === "carne" ||
    params.sabor === "palmito" ||
    params.sabor === "calabresa" ||
    params.sabor === "camarao"
      ? (params.sabor as Sabor)
      : "";
  const pesoFiltro = typeof params.peso === "string" ? normalizarPeso(params.peso) : "";
  const { produtos, erro } = await listarProdutos(sessao.tenantId);
  const produtoEdicao = produtos.find((produto) => produto.id === editarId) ?? null;
  const mostrarFormulario = Boolean(produtoEdicao) || novo === "1";
  const produtosFiltrados = produtos.filter((produto) => {
    const matchSabor = !saborFiltro || obterSaborEfetivo(produto) === saborFiltro;
    const matchPeso = !pesoFiltro || extrairPesoDoNome(produto.nome) === pesoFiltro;
    return matchSabor && matchPeso;
  });

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
          Configure as variaveis `SUPABASE_URL` e
          `SUPABASE_SERVICE_ROLE_KEY` no arquivo `.env.local` para habilitar o
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

      {sucessoAcao === "excluido" ? (
        <article className="rounded-xl border border-green-300 bg-green-50 p-4 text-sm text-green-800">
          Produto excluido com sucesso.
        </article>
      ) : null}

      {sucessoAcao === "inativado" ? (
        <article className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Produto retirado da listagem porque ja possui historico de pedidos.
        </article>
      ) : null}

      {erroAcao === "exclusao" ? (
        <article className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          Nao foi possivel excluir o produto. Tente novamente.
        </article>
      ) : null}

      <article className="rounded-xl border border-black/10 bg-surface p-4">
        <h2 className="text-lg font-medium">Produtos cadastrados</h2>

        <form method="get" className="mt-3 grid gap-2 rounded-lg border border-black/10 p-3 md:grid-cols-[1fr_1fr_auto_auto]">
          <label className="flex flex-col gap-1 text-sm">
            Filtrar por sabor
            <select
              name="sabor"
              defaultValue={saborFiltro}
              className="rounded-md border border-black/15 bg-white px-2 py-2"
            >
              <option value="">Todos</option>
              <option value="frango">Frango</option>
              <option value="carne">Carne</option>
              <option value="palmito">Palmito</option>
              <option value="calabresa">Calabresa</option>
              <option value="camarao">Camarao</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Filtrar por peso
            <select
              name="peso"
              defaultValue={pesoFiltro}
              className="rounded-md border border-black/15 bg-white px-2 py-2"
            >
              <option value="">Todos</option>
              <option value="50g">50g</option>
              <option value="350g">350g</option>
              <option value="500g">500g</option>
              <option value="1kg">1kg</option>
            </select>
          </label>

          <button
            type="submit"
            className="self-end rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-contrast"
          >
            Aplicar
          </button>

          <Link
            href="/produtos"
            className="self-end rounded-md border border-black/20 px-3 py-2 text-center text-sm"
          >
            Limpar
          </Link>
        </form>

        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-black/10 text-foreground/70">
                <th className="px-2 py-2 font-medium">Nome</th>
                <th className="px-2 py-2 font-medium">Sabor</th>
                <th className="px-2 py-2 font-medium">Preco</th>
                <th className="px-2 py-2 font-medium">Estoque atual</th>
                <th className="px-2 py-2 font-medium">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {produtosFiltrados.map((produto) => (
                <tr
                  key={produto.id}
                  className={`border-b border-black/5 ${
                    produto.estoque_atual === 0 ? "bg-red-50" : ""
                  }`}
                >
                  <td className="px-2 py-2">{produto.nome}</td>
                  <td className="px-2 py-2 capitalize">{obterSaborEfetivo(produto)}</td>
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
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {produtos.length === 0 ? (
          <p className="mt-3 text-sm text-foreground/70">Nenhum produto cadastrado ainda.</p>
        ) : produtosFiltrados.length === 0 ? (
          <p className="mt-3 text-sm text-foreground/70">
            Nenhum produto encontrado para o filtro selecionado.
          </p>
        ) : null}
      </article>
    </section>
  );
}
