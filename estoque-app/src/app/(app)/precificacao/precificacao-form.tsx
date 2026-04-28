"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { salvarProdutoPrecificacao } from "./actions";
import { TrashIcon } from "@/components/action-icons";

type IngredienteForm = {
  nome: string;
  quantidade: string;
  custo: number;
};

type IngredienteBaseOption = {
  id: string;
  nome: string;
  unidade_padrao: string | null;
  custo_padrao: number;
};

type ProdutoEdicao = {
  id: string;
  nome: string;
  preco_venda: number | null;
  ingredientes: IngredienteForm[];
};

const initialState = {
  ok: false,
  message: "",
};

function formatarMoeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

export function PrecificacaoForm({
  produtoEdicao,
  ingredientesBase,
  mostrarCancelarNovo,
}: {
  produtoEdicao: ProdutoEdicao | null;
  ingredientesBase: IngredienteBaseOption[];
  mostrarCancelarNovo: boolean;
}) {
  const [state, formAction, isPending] = useActionState(salvarProdutoPrecificacao, initialState);
  const emEdicao = Boolean(produtoEdicao);
  const [ingredientes, setIngredientes] = useState<IngredienteForm[]>(
    produtoEdicao?.ingredientes.length
      ? produtoEdicao.ingredientes
      : [{ nome: "", quantidade: "", custo: 0 }],
  );
  const [precoVenda, setPrecoVenda] = useState(
    produtoEdicao?.preco_venda === null || produtoEdicao?.preco_venda === undefined
      ? ""
      : String(produtoEdicao.preco_venda),
  );

  const ingredientesValidos = useMemo(() => {
    return ingredientes.filter(
      (item) =>
        item.nome.trim() &&
        item.quantidade.trim() &&
        Number.isFinite(item.custo) &&
        item.custo >= 0,
    );
  }, [ingredientes]);

  const custoTotal = useMemo(() => {
    return ingredientesValidos.reduce((acc, item) => acc + item.custo, 0);
  }, [ingredientesValidos]);

  const precoVendaNumero = Number(precoVenda.replace(",", "."));
  const margemPercentual =
    Number.isFinite(precoVendaNumero) && precoVendaNumero > 0 && custoTotal > 0
      ? ((precoVendaNumero - custoTotal) / custoTotal) * 100
      : null;

  function atualizarIngrediente(index: number, novo: IngredienteForm) {
    setIngredientes((atual) => atual.map((item, i) => (i === index ? novo : item)));
  }

  function adicionarIngrediente() {
    setIngredientes((atual) => [...atual, { nome: "", quantidade: "", custo: 0 }]);
  }

  function removerIngrediente(index: number) {
    setIngredientes((atual) => (atual.length === 1 ? atual : atual.filter((_, i) => i !== index)));
  }

  return (
    <form action={formAction} className="space-y-4 rounded-xl border border-black/10 bg-surface p-4">
      <h2 className="text-lg font-medium">{emEdicao ? "Detalhes de precificacao" : "Novo produto para precificacao"}</h2>

      <input type="hidden" name="id" value={produtoEdicao?.id ?? ""} />

      <label className="flex max-w-lg flex-col gap-1 text-sm">
        Produto
        <input
          name="nome"
          required
          defaultValue={produtoEdicao?.nome ?? ""}
          className="rounded-lg border border-black/15 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring"
          placeholder="Ex.: Brownie tradicional"
        />
      </label>

      <div className="space-y-3">
        <p className="text-sm font-medium">Ingredientes</p>

        {ingredientes.map((ingrediente, index) => (
          <div
            key={index}
            className="grid gap-2 rounded-lg border border-black/10 p-3 md:grid-cols-[190px_minmax(140px,1fr)_150px_130px_56px]"
          >
            <label className="flex flex-col gap-1 text-sm">
              Ingrediente cadastrado
              <select
                defaultValue=""
                onChange={(event) => {
                  const selecionado = ingredientesBase.find((item) => item.id === event.target.value);
                  if (!selecionado) return;
                  atualizarIngrediente(index, {
                    ...ingrediente,
                    nome: selecionado.nome,
                    quantidade: selecionado.unidade_padrao ?? ingrediente.quantidade,
                    custo: selecionado.custo_padrao,
                  });
                }}
                className="rounded-lg border border-black/15 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring"
              >
                <option value="">Selecionar (opcional)</option>
                {ingredientesBase.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nome} - {formatarMoeda(item.custo_padrao)}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm">
              Ingrediente
              <input
                type="text"
                value={ingrediente.nome}
                onChange={(event) =>
                  atualizarIngrediente(index, {
                    ...ingrediente,
                    nome: event.target.value,
                  })
                }
                className="rounded-lg border border-black/15 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring"
                placeholder="Ex.: Chocolate"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              Quantidade usada
              <input
                type="text"
                value={ingrediente.quantidade}
                onChange={(event) =>
                  atualizarIngrediente(index, {
                    ...ingrediente,
                    quantidade: event.target.value,
                  })
                }
                className="rounded-lg border border-black/15 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring"
                placeholder="Ex.: 200g"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              Custo (R$)
              <input
                type="number"
                min={0}
                step="0.01"
                value={ingrediente.custo}
                onChange={(event) =>
                  atualizarIngrediente(index, {
                    ...ingrediente,
                    custo: Number(event.target.value || 0),
                  })
                }
                className="rounded-lg border border-black/15 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring"
              />
            </label>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => removerIngrediente(index)}
                className="w-full rounded-lg border border-black/20 p-2 text-sm"
                aria-label="Remover ingrediente"
                title="Remover ingrediente"
              >
                <span className="flex items-center justify-center">
                  <TrashIcon />
                </span>
              </button>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={adicionarIngrediente}
          className="rounded-lg border border-black/20 px-3 py-2 text-sm"
        >
          + Adicionar ingrediente
        </button>
      </div>

      <input type="hidden" name="ingredientes" value={JSON.stringify(ingredientesValidos)} />

      <div className="grid gap-3 rounded-lg border border-black/10 bg-background p-3 md:grid-cols-2">
        <p className="text-sm">
          Custo total do produto: <span className="font-semibold text-primary">{formatarMoeda(custoTotal)}</span>
        </p>

        <label className="flex flex-col gap-1 text-sm">
          Preco de venda (R$)
          <input
            type="number"
            min={0}
            step="0.01"
            name="preco_venda"
            value={precoVenda}
            onChange={(event) => setPrecoVenda(event.target.value)}
            className="rounded-lg border border-black/15 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring"
            placeholder="Opcional"
          />
        </label>
      </div>

      {margemPercentual !== null ? (
        <p className="text-sm">
          Margem estimada:{" "}
          <span className={`font-semibold ${margemPercentual >= 0 ? "text-green-700" : "text-red-700"}`}>
            {margemPercentual.toFixed(2)}%
          </span>
        </p>
      ) : null}

      {state.message ? (
        <p
          className={`rounded-lg px-3 py-2 text-sm ${
            state.ok ? "bg-green-100 text-green-800" : "bg-red-100 text-red-700"
          }`}
        >
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-contrast disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isPending ? "Salvando..." : emEdicao ? "Salvar alteracoes" : "Salvar produto"}
      </button>

      {emEdicao || mostrarCancelarNovo ? (
        <Link
          href="/precificacao"
          className="ml-2 inline-block rounded-lg border border-black/20 px-4 py-2 text-sm font-medium"
        >
          Cancelar
        </Link>
      ) : null}
    </form>
  );
}

