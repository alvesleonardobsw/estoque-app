"use client";

import { useEffect, useState } from "react";
import { toPng } from "html-to-image";

async function gerarImagemComanda(comanda: HTMLElement, nomeArquivo: string) {
  const opcoes = { backgroundColor: "#ffffff", pixelRatio: 2 };
  // A primeira chamada pode sair sem as fontes no Safari; a segunda sai completa.
  await toPng(comanda, opcoes);
  const dataUrl = await toPng(comanda, opcoes);
  const blob = await (await fetch(dataUrl)).blob();
  return new File([blob], nomeArquivo, { type: "image/png" });
}

function baixarArquivo(arquivo: File) {
  const url = URL.createObjectURL(arquivo);
  const link = document.createElement("a");
  link.href = url;
  link.download = arquivo.name;
  link.click();
  URL.revokeObjectURL(url);
}

export function PrintControls({
  comandaId,
  nomeArquivo,
}: {
  comandaId: string;
  nomeArquivo: string;
}) {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [mensagem, setMensagem] = useState("");

  // Gera a imagem ao abrir a pagina: o celular (principalmente o iPhone) so abre a
  // janela de compartilhar logo apos o toque, sem tempo para gerar a imagem no clique.
  useEffect(() => {
    const comanda = document.getElementById(comandaId);
    if (!comanda) return;

    let cancelado = false;
    gerarImagemComanda(comanda, nomeArquivo)
      .then((novoArquivo) => {
        if (!cancelado) setArquivo(novoArquivo);
      })
      .catch(() => {
        if (!cancelado) setMensagem("Nao foi possivel gerar a imagem da comanda.");
      });

    return () => {
      cancelado = true;
    };
  }, [comandaId, nomeArquivo]);

  async function compartilhar() {
    if (!arquivo) return;
    setMensagem("");

    // Celular: abre a janela de compartilhar do sistema (WhatsApp, Telegram, e-mail...).
    if (navigator.canShare?.({ files: [arquivo] })) {
      try {
        await navigator.share({ files: [arquivo], title: "Comanda do Pedido" });
      } catch (erro) {
        // AbortError = a pessoa fechou a janela de compartilhar; nao e erro.
        if (!(erro instanceof DOMException && erro.name === "AbortError")) {
          baixarArquivo(arquivo);
          setMensagem("Nao foi possivel abrir o compartilhamento. A imagem foi baixada.");
        }
      }
      return;
    }

    // Sem suporte a compartilhar arquivos (comum no computador): baixa a imagem.
    baixarArquivo(arquivo);
    setMensagem("Imagem da comanda baixada. Anexe no WhatsApp ou onde preferir.");
  }

  return (
    <div className="mb-4 space-y-2 print:hidden">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-lg bg-black px-3 py-2 text-sm font-medium text-white"
        >
          Imprimir
        </button>
        <button
          type="button"
          onClick={compartilhar}
          disabled={!arquivo}
          className="rounded-lg bg-black px-3 py-2 text-sm font-medium text-white disabled:opacity-70"
        >
          {arquivo ? "Compartilhar" : "Preparando..."}
        </button>
        <button
          type="button"
          onClick={() => window.close()}
          className="rounded-lg border border-black/20 px-3 py-2 text-sm"
        >
          Fechar
        </button>
      </div>
      {mensagem ? <p className="text-xs text-black/70">{mensagem}</p> : null}
    </div>
  );
}
