"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { salvarProdutoPrecificacao } from "./actions";
import { TrashIcon } from "@/components/action-icons";

type TipoCusto = "ingrediente" | "embalagem" | "gas" | "energia" | "mao_obra" | "outro";

type ItemCustoForm = {
  tipo: TipoCusto;
  nome: string;
  quantidade: string;
  custo: number;
};

type CustoBaseOption = {
  id: string;
  tipo: TipoCusto;
  nome: string;
  unidade_padrao: string | null;
  custo_padrao: number;
};

type ProdutoEdicao = {
  id: string;
  nome: string;
  preco_venda: number | null;
  itens: ItemCustoForm[];
};

const initialState = { ok: false, message: "" };

function formatarMoeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);
}

function blocoTipo(tipo: TipoCusto) {
  if (tipo === "ingrediente") return "Ingredientes utilizados";
  return "Outros custos";
}

export function PrecificacaoForm({
  produtoEdicao,
  custosBase,
  mostrarCancelarNovo,
}: {
  produtoEdicao: ProdutoEdicao | null;
  custosBase: CustoBaseOption[];
  mostrarCancelarNovo: boolean;
}) {
  const [state, formAction, isPending] = useActionState(salvarProdutoPrecificacao, initialState);
  const emEdicao = Boolean(produtoEdicao);
  const [precoVenda, setPrecoVenda] = useState(
    produtoEdicao?.preco_venda == null ? "" : String(produtoEdicao.preco_venda),
  );

  const itensIniciais = produtoEdicao?.itens.length
    ? produtoEdicao.itens
    : [{ tipo: "ingrediente" as TipoCusto, nome: "", quantidade: "", custo: 0 }];

  const [itens, setItens] = useState<ItemCustoForm[]>(itensIniciais);

  const ingredientesBase = custosBase.filter((item) => item.tipo === "ingrediente");
  const outrosBase = custosBase.filter((item) => item.tipo !== "ingrediente");

  const ingredientes = itens.filter((item) => item.tipo === "ingrediente");
  const outrosCustos = itens.filter((item) => item.tipo !== "ingrediente");

  const custoTotal = useMemo(
    () =>
      itens
        .filter((item) => item.nome.trim() && item.quantidade.trim() && Number.isFinite(item.custo) && item.custo >= 0)
        .reduce((acc, item) => acc + item.custo, 0),
    [itens],
  );

  const precoVendaNumero = Number(precoVenda.replace(",", "."));
  const margemPercentual =
    Number.isFinite(precoVendaNumero) && precoVendaNumero > 0 && custoTotal > 0
      ? ((precoVendaNumero - custoTotal) / custoTotal) * 100
      : null;

  function atualizarItem(indexGlobal: number, novo: ItemCustoForm) {
    setItens((atual) => atual.map((item, i) => (i === indexGlobal ? novo : item)));
  }

  function adicionar(tipo: TipoCusto) {
    setItens((atual) => [...atual, { tipo, nome: "", quantidade: "", custo: 0 }]);
  }

  function adicionarComBase(base: CustoBaseOption) {
    setItens((atual) => [
      ...atual,
      {
        tipo: base.tipo,
        nome: base.nome,
        quantidade: base.unidade_padrao ?? "1 un",
        custo: base.custo_padrao,
      },
    ]);
  }

  function remover(indexGlobal: number) {
    setItens((atual) => (atual.length === 1 ? atual : atual.filter((_, i) => i !== indexGlobal)));
  }

  function renderLinha(
    item: ItemCustoForm,
    indexGlobal: number,
    opcoes: CustoBaseOption[],
    mostrarSelectBase: boolean,
  ) {
    return (
      <div
        key={`${indexGlobal}-${item.tipo}`}
        className={`grid gap-2 rounded-lg border border-black/10 p-3 ${
          mostrarSelectBase
            ? "md:grid-cols-[180px_minmax(140px,1fr)_150px_130px_56px]"
            : "md:grid-cols-[minmax(140px,1fr)_150px_130px_56px]"
        }`}
      >
        {mostrarSelectBase ? (
          <label className="flex flex-col gap-1 text-sm">
            Item cadastrado
            <select
              defaultValue=""
              onChange={(event) => {
                const base = opcoes.find((o) => o.id === event.target.value);
                if (!base) return;
                atualizarItem(indexGlobal, {
                  ...item,
                  tipo: base.tipo,
                  nome: base.nome,
                  quantidade: base.unidade_padrao ?? item.quantidade,
                  custo: base.custo_padrao,
                });
              }}
              className="rounded-lg border border-black/15 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring"
            >
              <option value="">Selecionar (opcional)</option>
              {opcoes.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nome} - {formatarMoeda(o.custo_padrao)}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label className="flex flex-col gap-1 text-sm">
          {item.tipo === "ingrediente" ? "Ingrediente" : "Descricao"}
          <input
            type="text"
            value={item.nome}
            onChange={(e) => atualizarItem(indexGlobal, { ...item, nome: e.target.value })}
            className="rounded-lg border border-black/15 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Quantidade/Unidade
          <input
            type="text"
            value={item.quantidade}
            onChange={(e) => atualizarItem(indexGlobal, { ...item, quantidade: e.target.value })}
            className="rounded-lg border border-black/15 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Custo (R$)
          <input
            type="number"
            min={0}
            step="0.01"
            value={item.custo}
            onChange={(e) => atualizarItem(indexGlobal, { ...item, custo: Number(e.target.value || 0) })}
            className="rounded-lg border border-black/15 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring"
          />
        </label>

        <div className="flex items-end">
          <button
            type="button"
            onClick={() => remover(indexGlobal)}
            className="w-full rounded-lg border border-black/20 p-2 text-sm"
            aria-label="Remover item"
            title="Remover item"
          >
            <span className="flex items-center justify-center">
              <TrashIcon />
            </span>
          </button>
        </div>
      </div>
    );
  }

  const ingredientesValidos = itens
    .filter((i) => i.tipo === "ingrediente")
    .filter((i) => i.nome.trim() && i.quantidade.trim() && Number.isFinite(i.custo) && i.custo >= 0);

  const outrosValidos = itens
    .filter((i) => i.tipo !== "ingrediente")
    .filter((i) => i.nome.trim() && i.quantidade.trim() && Number.isFinite(i.custo) && i.custo >= 0);

  return (
    <form action={formAction} className="space-y-4 rounded-xl border border-black/10 bg-surface p-4">
      <h2 className="text-lg font-medium">{emEdicao ? "Precificacao do produto" : "Novo produto"}</h2>

      <input type="hidden" name="id" value={produtoEdicao?.id ?? ""} />

      <label className="flex max-w-lg flex-col gap-1 text-sm">
        Produto
        <input
          name="nome"
          required
          defaultValue={produtoEdicao?.nome ?? ""}
          className="rounded-lg border border-black/15 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring"
        />
      </label>

      <div className="space-y-2">
        <p className="text-sm font-medium">{blocoTipo("ingrediente")}</p>
        {ingredientes.map((item) => {
          const indexGlobal = itens.findIndex((i) => i === item);
          return renderLinha(item, indexGlobal, ingredientesBase, true);
        })}
        <button type="button" onClick={() => adicionar("ingrediente")} className="rounded-lg border border-black/20 px-3 py-2 text-sm">
          + Adicionar ingrediente
        </button>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Outros custos</p>
        {outrosCustos.map((item) => {
          const indexGlobal = itens.findIndex((i) => i === item);
          return renderLinha(item, indexGlobal, outrosBase, false);
        })}
        <label className="inline-flex flex-col gap-1 text-sm">
          Adicionar outros custos
          <select
            defaultValue=""
            onChange={(event) => {
              const base = outrosBase.find((item) => item.id === event.target.value);
              if (!base) return;
              adicionarComBase(base);
              event.currentTarget.value = "";
            }}
            className="rounded-lg border border-black/20 px-3 py-2 text-sm"
          >
            <option value="">Selecionar custo</option>
            {outrosBase.map((item) => (
              <option key={item.id} value={item.id}>
                {item.nome} ({item.tipo.replace("_", " ")}) - {formatarMoeda(item.custo_padrao)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <input type="hidden" name="ingredientes" value={JSON.stringify(ingredientesValidos)} />
      <input type="hidden" name="outros_custos" value={JSON.stringify(outrosValidos)} />

      <div className="grid gap-3 rounded-lg border border-black/10 bg-background p-3 md:grid-cols-2">
        <p className="text-sm">Custo total: <span className="font-semibold text-primary">{formatarMoeda(custoTotal)}</span></p>
        <label className="flex flex-col gap-1 text-sm">
          Preco de venda (R$)
          <input
            type="number"
            min={0}
            step="0.01"
            name="preco_venda"
            value={precoVenda}
            onChange={(e) => setPrecoVenda(e.target.value)}
            className="rounded-lg border border-black/15 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring"
          />
        </label>
      </div>

      {margemPercentual !== null ? (
        <p className="text-sm">
          Margem estimada: <span className={`font-semibold ${margemPercentual >= 0 ? "text-green-700" : "text-red-700"}`}>{margemPercentual.toFixed(2)}%</span>
        </p>
      ) : null}

      {state.message ? <p className={`rounded-lg px-3 py-2 text-sm ${state.ok ? "bg-green-100 text-green-800" : "bg-red-100 text-red-700"}`}>{state.message}</p> : null}

      <button type="submit" disabled={isPending} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-contrast disabled:opacity-70">
        {isPending ? "Salvando..." : "Salvar"}
      </button>

      {emEdicao || mostrarCancelarNovo ? (
        <Link href="/precificacao" className="ml-2 inline-block rounded-lg border border-black/20 px-4 py-2 text-sm font-medium">
          Cancelar
        </Link>
      ) : null}
    </form>
  );
}
