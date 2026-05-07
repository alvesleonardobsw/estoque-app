import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { getSupabaseClient, hasSupabaseEnv } from "@/lib/supabase";
import { PrecificacaoForm } from "./precificacao-form";
import { excluirIngredienteBasePrecificacao, excluirProdutoPrecificacao, salvarCustoBasePrecificacao } from "./actions";
import { EditIcon, TrashIcon } from "@/components/action-icons";

type TipoCusto = "ingrediente" | "embalagem" | "gas" | "energia" | "mao_obra" | "outro";

type ItemPrecificacao = { id: string; tipo: TipoCusto; nome: string; quantidade: string; custo: number };
type ItemBase = { id: string; tipo: TipoCusto; nome: string; unidade_padrao: string | null; custo_padrao: number };
type ProdutoPrecificacao = {
  id: string;
  nome: string;
  preco_venda: number | null;
  created_at: string;
  precificacao_ingredientes: ItemPrecificacao[] | ItemPrecificacao | null;
};

type PageProps = {
  searchParams: Promise<{ tab?: string; editar?: string; novo?: string; erro?: string; sucesso?: string }>;
};

function formatarMoeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);
}

function normalizarItens(relacao: ProdutoPrecificacao["precificacao_ingredientes"]): ItemPrecificacao[] {
  if (!relacao) return [];
  if (Array.isArray(relacao)) return relacao;
  return [relacao];
}

function tituloTipo(tipo: TipoCusto) {
  switch (tipo) {
    case "ingrediente": return "Ingredientes";
    case "embalagem": return "Embalagem";
    case "gas": return "Gas";
    case "energia": return "Energia";
    case "mao_obra": return "Mao de obra";
    default: return "Outros";
  }
}

async function carregarDados(tenantId: string) {
  if (!hasSupabaseEnv()) return { produtos: [] as ProdutoPrecificacao[], base: [] as ItemBase[], erro: "" };
  const supabase = getSupabaseClient();
  const [produtosResp, baseResp] = await Promise.all([
    supabase
      .from("precificacao_produtos")
      .select("id, nome, preco_venda, created_at, precificacao_ingredientes(id, tipo, nome, quantidade, custo)")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false }),
    supabase
      .from("precificacao_custos_base")
      .select("id, tipo, nome, unidade_padrao, custo_padrao")
      .eq("tenant_id", tenantId)
      .order("nome", { ascending: true }),
  ]);

  return {
    produtos: (produtosResp.data ?? []) as ProdutoPrecificacao[],
    base: (baseResp.data ?? []) as ItemBase[],
    erro: produtosResp.error?.message || baseResp.error?.message || "",
  };
}

export default async function PrecificacaoPage({ searchParams }: PageProps) {
  const sessao = await requireSession();
  const params = await searchParams;
  const tab = params.tab === "ingredientes" || params.tab === "custos" ? params.tab : "produtos";
  const editarId = typeof params.editar === "string" ? params.editar : "";
  const novo = typeof params.novo === "string" ? params.novo : "";
  const erroAcao = typeof params.erro === "string" ? params.erro : "";
  const sucessoAcao = typeof params.sucesso === "string" ? params.sucesso : "";

  const { produtos, base, erro } = await carregarDados(sessao.tenantId);
  const produtoEdicao = produtos.find((p) => p.id === editarId) ?? null;
  const mostrarFormProduto = tab === "produtos" && (Boolean(produtoEdicao) || novo === "1");

  const baseIngredientes = base.filter((b) => b.tipo === "ingrediente");
  const baseCustos = base.filter((b) => b.tipo !== "ingrediente");

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-foreground/70">Gestao de custos</p>
          <h1 className="text-2xl font-semibold">Precificacao</h1>
        </div>
        {tab === "produtos" ? (
          <Link href="/precificacao?tab=produtos&novo=1" className="inline-block rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-contrast">Novo produto</Link>
        ) : (
          <Link href={`/precificacao?tab=${tab}`} className="inline-block rounded-lg border border-black/20 px-4 py-2 text-sm font-medium">Atualizar</Link>
        )}
      </header>

      <nav className="flex flex-wrap gap-2">
        <Link href="/precificacao?tab=produtos" className={`rounded-lg px-3 py-2 text-sm ${tab === "produtos" ? "bg-primary text-primary-contrast" : "border border-black/20"}`}>Produtos</Link>
        <Link href="/precificacao?tab=ingredientes" className={`rounded-lg px-3 py-2 text-sm ${tab === "ingredientes" ? "bg-primary text-primary-contrast" : "border border-black/20"}`}>Ingredientes</Link>
        <Link href="/precificacao?tab=custos" className={`rounded-lg px-3 py-2 text-sm ${tab === "custos" ? "bg-primary text-primary-contrast" : "border border-black/20"}`}>Outros custos</Link>
      </nav>

      {!hasSupabaseEnv() ? <article className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">Configure `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`.</article> : null}
      {erro ? <article className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">Erro ao carregar precificacao: {erro}</article> : null}
      {sucessoAcao ? <article className="rounded-xl border border-green-300 bg-green-50 p-4 text-sm text-green-800">Operacao realizada com sucesso.</article> : null}
      {erroAcao ? <article className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800">Nao foi possivel concluir a operacao.</article> : null}

      {tab === "produtos" ? (
        <>
          {mostrarFormProduto ? (
            <PrecificacaoForm
              key={produtoEdicao?.id ?? "novo"}
              custosBase={base}
              produtoEdicao={
                produtoEdicao
                  ? {
                      id: produtoEdicao.id,
                      nome: produtoEdicao.nome,
                      preco_venda: produtoEdicao.preco_venda,
                      itens: normalizarItens(produtoEdicao.precificacao_ingredientes),
                    }
                  : null
              }
              mostrarCancelarNovo={!produtoEdicao}
            />
          ) : null}

          <article className="rounded-xl border border-black/10 bg-surface p-4">
            <h2 className="text-lg font-medium">Produtos precificados</h2>
            {produtos.length === 0 ? (
              <p className="mt-3 text-sm text-foreground/70">Nenhum produto precificado ainda.</p>
            ) : (
              <div className="mt-3 space-y-3">
                {produtos.map((produto) => {
                  const itens = normalizarItens(produto.precificacao_ingredientes);
                  const custoTotal = itens.reduce((acc, i) => acc + Number(i.custo ?? 0), 0);
                  const margem = produto.preco_venda && custoTotal > 0 ? ((produto.preco_venda - custoTotal) / custoTotal) * 100 : null;
                  return (
                    <div key={produto.id} className="rounded-lg border border-black/10 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <Link href={`/precificacao?tab=produtos&editar=${produto.id}`} className="flex-1 transition hover:text-primary">
                          <p className="font-medium">{produto.nome}</p>
                          <p className="text-sm text-foreground/80">Custo total: <span className="font-semibold">{formatarMoeda(custoTotal)}</span></p>
                          <p className="text-sm text-foreground/80">Preco de venda: <span className="font-semibold">{produto.preco_venda == null ? "Nao definido" : formatarMoeda(produto.preco_venda)}</span></p>
                          {margem !== null ? <p className="text-sm">Margem: <span className={`font-semibold ${margem >= 0 ? "text-green-700" : "text-red-700"}`}>{margem.toFixed(2)}%</span></p> : null}
                        </Link>
                        <div className="flex items-center gap-2">
                          <Link href={`/precificacao?tab=produtos&editar=${produto.id}`} className="rounded-md border border-black/20 p-2 text-xs"><EditIcon /></Link>
                          <form action={excluirProdutoPrecificacao}>
                            <input type="hidden" name="id" value={produto.id} />
                            <button type="submit" className="rounded-md border border-black/20 p-2 text-xs"><TrashIcon /></button>
                          </form>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </article>
        </>
      ) : null}

      {tab === "ingredientes" || tab === "custos" ? (
        <article className="rounded-xl border border-black/10 bg-surface p-4">
          <h2 className="text-lg font-medium">{tab === "ingredientes" ? "Ingredientes base" : "Outros custos base"}</h2>
          <form action={salvarCustoBasePrecificacao} className={`mt-3 grid gap-2 ${
            tab === "ingredientes"
              ? "md:grid-cols-[160px_minmax(160px,1fr)_170px_130px_auto]"
              : "md:grid-cols-[180px_130px_120px]"
          }`}>
            <input type="hidden" name="tab" value={tab} />
            <label className="flex flex-col gap-1 text-sm">Categoria
              <select name="tipo" defaultValue={tab === "ingredientes" ? "ingrediente" : "outro"} className="rounded-lg border border-black/15 bg-white px-3 py-2">
                {tab === "ingredientes" ? <option value="ingrediente">Ingrediente</option> : null}
                {tab === "custos" ? (
                  <>
                    <option value="embalagem">Embalagem</option>
                    <option value="gas">Gas</option>
                    <option value="energia">Energia</option>
                    <option value="mao_obra">Mao de obra</option>
                    <option value="outro">Outro</option>
                  </>
                ) : null}
              </select>
            </label>
            {tab === "ingredientes" ? (
              <>
                <label className="flex flex-col gap-1 text-sm">Nome<input name="nome" required className="rounded-lg border border-black/15 bg-white px-3 py-2" /></label>
                <label className="flex flex-col gap-1 text-sm">Unidade<input name="unidade_padrao" className="rounded-lg border border-black/15 bg-white px-3 py-2" /></label>
              </>
            ) : (
              <>
                <input type="hidden" name="nome" value="" />
                <input type="hidden" name="unidade_padrao" value="" />
              </>
            )}
            <label className="flex flex-col gap-1 text-sm">Custo (R$)<input type="number" min={0} step="0.01" name="custo_padrao" required className="rounded-lg border border-black/15 bg-white px-3 py-2" /></label>
            <button type="submit" className="self-end rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-contrast">Salvar</button>
          </form>

          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-black/10 text-foreground/70">
                  <th className="px-2 py-2">Categoria</th>
                  {tab === "ingredientes" ? <th className="px-2 py-2">Nome</th> : null}
                  {tab === "ingredientes" ? <th className="px-2 py-2">Unidade</th> : null}
                  <th className="px-2 py-2">Custo</th>
                  <th className="px-2 py-2">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {(tab === "ingredientes" ? baseIngredientes : baseCustos).map((item) => (
                  <tr key={item.id} className="border-b border-black/5">
                    <td className="px-2 py-2">{tituloTipo(item.tipo)}</td>
                    {tab === "ingredientes" ? <td className="px-2 py-2">{item.nome}</td> : null}
                    {tab === "ingredientes" ? <td className="px-2 py-2">{item.unidade_padrao || "-"}</td> : null}
                    <td className="px-2 py-2">{formatarMoeda(item.custo_padrao)}</td>
                    <td className="px-2 py-2">
                      <form action={excluirIngredienteBasePrecificacao}>
                        <input type="hidden" name="id" value={item.id} />
                        <input type="hidden" name="tab" value={tab} />
                        <button type="submit" className="rounded-md border border-black/20 p-2 text-xs"><TrashIcon /></button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      ) : null}
    </section>
  );
}
