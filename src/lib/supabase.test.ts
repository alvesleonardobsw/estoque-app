import { afterEach, describe, expect, it, vi } from "vitest";
import { mensagemErro } from "./supabase";

const MENSAGEM_BANCO_FORA = "O banco de dados nao respondeu. Tente novamente em alguns instantes.";

describe("mensagemErro", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("retorna vazio quando nao ha erro", () => {
    expect(mensagemErro(null, undefined)).toBe("");
  });

  it("repassa a mensagem de erros comuns do banco", () => {
    expect(mensagemErro({ message: "estoque insuficiente" })).toBe("estoque insuficiente");
  });

  it("usa o primeiro erro preenchido", () => {
    expect(mensagemErro(null, { message: "primeiro" }, { message: "segundo" })).toBe("primeiro");
  });

  // Regressao: fix(erros) 6cbe3d8. Com o Supabase fora do ar, a pagina HTML do Cloudflare
  // aparecia crua na tela.
  it("regressao: troca a pagina HTML do Cloudflare por mensagem amigavel e loga o erro", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const html = "<!DOCTYPE html><html><head><title>522: Connection timed out</title></head></html>";

    expect(mensagemErro({ message: html })).toBe(MENSAGEM_BANCO_FORA);
    expect(log).toHaveBeenCalledOnce();
  });

  it.each(["TypeError: fetch failed", "FetchError: request failed", "read ECONNRESET", "connect ETIMEDOUT"])(
    "regressao: trata falha de rede (%s) como banco indisponivel",
    (mensagem) => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      expect(mensagemErro({ message: mensagem })).toBe(MENSAGEM_BANCO_FORA);
    },
  );
});
