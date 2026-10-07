"use client";

import { useEffect, useRef, useState } from "react";
import { Anton, Great_Vibes, Jost } from "next/font/google";
import { toJpeg } from "html-to-image";
import {
  CARDAPIO_ALTURA_CONTEUDO,
  CARDAPIO_ALTURA_LINHA,
  CARDAPIO_ALTURA_TITULO,
  paginarCardapio,
  type BlocoCardapio,
} from "@/lib/cardapio";
import { carregarCardapioDisponivel } from "./actions";

const anton = Anton({ weight: "400", subsets: ["latin"] });
const greatVibes = Great_Vibes({ weight: "400", subsets: ["latin"] });
const jost = Jost({ weight: ["400", "500"], subsets: ["latin"] });

const VERMELHO = "#A51D1D";
const CREME = "#F3E4D2";
const MARROM = "#7A2A20";
const DIVISORIA = "#C9A99A";
const LARGURA = 1080;
const ALTURA = 1920;

function dataHoje() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

async function gerarArquivo(pagina: HTMLElement, nomeArquivo: string) {
  const opcoes = { width: LARGURA, height: ALTURA, pixelRatio: 1, quality: 0.92, backgroundColor: CREME };
  // A primeira chamada pode sair sem as fontes no Safari; a segunda sai completa.
  await toJpeg(pagina, opcoes);
  const dataUrl = await toJpeg(pagina, opcoes);
  const blob = await (await fetch(dataUrl)).blob();
  return new File([blob], nomeArquivo, { type: "image/jpeg" });
}

function baixarArquivos(arquivos: File[]) {
  for (const arquivo of arquivos) {
    const url = URL.createObjectURL(arquivo);
    const link = document.createElement("a");
    link.href = url;
    link.download = arquivo.name;
    link.click();
    URL.revokeObjectURL(url);
  }
}

function InstagramIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" />
    </svg>
  );
}

function WhatsappIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3.5 20.5l1.3-4A8.5 8.5 0 1 1 8 19.6z" strokeLinejoin="round" />
      <path
        d="M9 8.5c0 3.5 3 6.5 6.5 6.5l1-1.5-2-1-1 .8c-1-.5-2-1.5-2.5-2.5l.8-1-1-2z"
        fill="currentColor"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PaginaCardapio({
  blocos,
  numero,
  total,
}: {
  blocos: BlocoCardapio[];
  numero: number;
  total: number;
}) {
  return (
    <div
      className={jost.className}
      style={{
        width: LARGURA,
        height: ALTURA,
        position: "relative",
        overflow: "hidden",
        background: CREME,
        color: VERMELHO,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 151,
          width: 130,
          background: `conic-gradient(${VERMELHO} 25%, ${CREME} 0 50%, ${VERMELHO} 0 75%, ${CREME} 0) 0 0 / 65px 65px`,
        }}
      />
      {total > 1 ? (
        <span style={{ position: "absolute", top: 72, right: 166, fontSize: 43, color: MARROM }}>
          {numero}/{total}
        </span>
      ) : null}

      <div style={{ padding: "72px 187px 0 72px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 29 }}>
          <span className={anton.className} style={{ fontSize: 115, lineHeight: 1, letterSpacing: 4 }}>
            MENU
          </span>
          <span style={{ width: 4, height: 94, background: VERMELHO }} />
          <span style={{ display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 0.9 }}>
            <span className={greatVibes.className} style={{ fontSize: 54 }}>
              Dona Leda
            </span>
            <span className={anton.className} style={{ fontSize: 54, letterSpacing: 4 }}>
              EMPADAS
            </span>
          </span>
        </div>

        <p style={{ margin: "36px 0 0", fontSize: 47, color: MARROM }}>Passando para divulgar essas delícias</p>

        <div style={{ height: CARDAPIO_ALTURA_CONTEUDO, overflow: "hidden" }}>
          {blocos.map((bloco) => (
            <div key={bloco.titulo}>
              <div
                style={{
                  height: CARDAPIO_ALTURA_TITULO,
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "space-between",
                  paddingBottom: 8,
                  boxSizing: "border-box",
                }}
              >
                <span style={{ fontSize: 54, fontWeight: 500 }}>{bloco.titulo}</span>
                <span style={{ fontSize: 40, color: MARROM }}>Qntd Disponível</span>
              </div>
              {bloco.linhas.map((linha, indice) => (
                <div
                  key={linha.sabor}
                  style={{
                    height: CARDAPIO_ALTURA_LINHA,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontSize: 61,
                    borderBottom: indice < bloco.linhas.length - 1 ? `3px solid ${DIVISORIA}` : "none",
                    boxSizing: "border-box",
                  }}
                >
                  <span>{linha.sabor}</span>
                  <span style={{ fontWeight: 500 }}>{linha.quantidade} un.</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <p style={{ position: "absolute", left: 72, bottom: 194, margin: 0, fontSize: 47, color: MARROM }}>
        A melhor que você já comeu.
      </p>

      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 151,
          background: VERMELHO,
          color: CREME,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 65,
          fontSize: 43,
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <InstagramIcon /> @ledaempadas
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <WhatsappIcon /> 48 99681-9212
        </span>
      </div>
    </div>
  );
}

export function CardapioEstoque() {
  const [carregando, setCarregando] = useState(false);
  const [paginas, setPaginas] = useState<BlocoCardapio[][]>([]);
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [previas, setPrevias] = useState<string[]>([]);
  const [mensagem, setMensagem] = useState("");
  const paginasRef = useRef<(HTMLDivElement | null)[]>([]);

  const aberto = carregando || paginas.length > 0 || Boolean(mensagem);

  async function gerar() {
    setCarregando(true);
    setMensagem("");
    setArquivos([]);
    setPrevias([]);
    setPaginas([]);

    const resultado = await carregarCardapioDisponivel();
    if (!resultado.ok) {
      setCarregando(false);
      setMensagem(resultado.message);
      return;
    }
    if (resultado.blocos.length === 0) {
      setCarregando(false);
      setMensagem("Nenhum produto com estoque disponivel no momento.");
      return;
    }
    // As paginas sao desenhadas fora da tela; o efeito abaixo transforma cada uma em JPG.
    setPaginas(paginarCardapio(resultado.blocos));
  }

  useEffect(() => {
    if (paginas.length === 0) return;

    let cancelado = false;
    const data = dataHoje();

    (async () => {
      await document.fonts.ready;
      const novosArquivos: File[] = [];
      for (const [indice, pagina] of paginasRef.current.slice(0, paginas.length).entries()) {
        if (!pagina) continue;
        const sufixo = paginas.length > 1 ? `-${indice + 1}` : "";
        novosArquivos.push(await gerarArquivo(pagina, `menu-dona-leda-${data}${sufixo}.jpg`));
      }
      return novosArquivos;
    })()
      .then((novosArquivos) => {
        if (cancelado) return;
        setArquivos(novosArquivos);
        setPrevias(novosArquivos.map((arquivo) => URL.createObjectURL(arquivo)));
      })
      .catch(() => {
        if (!cancelado) setMensagem("Nao foi possivel gerar a imagem do cardapio.");
      })
      .finally(() => {
        if (!cancelado) setCarregando(false);
      });

    return () => {
      cancelado = true;
    };
  }, [paginas]);

  useEffect(() => {
    return () => previas.forEach((url) => URL.revokeObjectURL(url));
  }, [previas]);

  function fechar() {
    setPaginas([]);
    setArquivos([]);
    setPrevias([]);
    setMensagem("");
    setCarregando(false);
  }

  async function compartilhar() {
    if (arquivos.length === 0) return;
    setMensagem("");

    // Celular: abre a janela de compartilhar do sistema com todas as imagens juntas.
    if (navigator.canShare?.({ files: arquivos })) {
      try {
        await navigator.share({ files: arquivos, title: "Menu Dona Leda Empadas" });
      } catch (erro) {
        // AbortError = a pessoa fechou a janela de compartilhar; nao e erro.
        if (!(erro instanceof DOMException && erro.name === "AbortError")) {
          baixarArquivos(arquivos);
          setMensagem("Nao foi possivel abrir o compartilhamento. As imagens foram baixadas.");
        }
      }
      return;
    }

    // Sem suporte a compartilhar arquivos (comum no computador): baixa as imagens.
    baixarArquivos(arquivos);
    setMensagem(arquivos.length > 1 ? "Imagens baixadas." : "Imagem baixada.");
  }

  return (
    <>
      <button
        type="button"
        onClick={gerar}
        disabled={carregando}
        className="inline-block rounded-lg border border-primary px-4 py-2 text-sm font-medium text-primary disabled:opacity-70"
      >
        Gerar imagem do estoque
      </button>

      {/* Paginas em tamanho real (1080x1920), fora da tela, usadas so para gerar os JPGs. */}
      <div aria-hidden="true" style={{ position: "fixed", left: -20000, top: 0, pointerEvents: "none" }}>
        {paginas.map((blocos, indice) => (
          <div
            key={indice}
            ref={(elemento) => {
              paginasRef.current[indice] = elemento;
            }}
          >
            <PaginaCardapio blocos={blocos} numero={indice + 1} total={paginas.length} />
          </div>
        ))}
      </div>

      {aberto ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-full w-full max-w-lg space-y-4 overflow-y-auto rounded-xl bg-surface p-4">
            <h2 className="text-lg font-medium">Imagem do estoque</h2>

            {carregando ? <p className="text-sm text-foreground/70">Gerando imagem...</p> : null}

            {previas.length > 0 ? (
              <div className="flex gap-3 overflow-x-auto">
                {previas.map((url, indice) => (
                  // eslint-disable-next-line @next/next/no-img-element -- previa local (blob:), sem otimizacao
                  <img
                    key={url}
                    src={url}
                    alt={`Imagem ${indice + 1} do cardapio`}
                    className="w-40 shrink-0 rounded-md border border-black/10"
                  />
                ))}
              </div>
            ) : null}

            {mensagem ? <p className="text-sm text-foreground/80">{mensagem}</p> : null}

            <div className="flex gap-2">
              {arquivos.length > 0 ? (
                <button
                  type="button"
                  onClick={compartilhar}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-contrast"
                >
                  Compartilhar
                </button>
              ) : null}
              <button
                type="button"
                onClick={fechar}
                className="rounded-lg border border-black/20 px-4 py-2 text-sm"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
