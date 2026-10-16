import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const cookiesMock = vi.hoisted(() => ({ token: undefined as string | undefined }));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => (cookiesMock.token ? { value: cookiesMock.token } : undefined),
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`redirect:${url}`);
  },
}));

const { credenciaisValidas, criarTokenParaUsuario, getOptionalSession, requireSession } = await import(
  "./auth"
);

describe("auth", () => {
  beforeEach(() => {
    vi.stubEnv("AUTH_SESSION_SECRET", "segredo-de-teste");
    vi.stubEnv("AUTH_USER", "Loja");
    vi.stubEnv("AUTH_PASS", "senha-1");
    vi.stubEnv("AUTH_TENANT_1", "tenant-a");
    vi.stubEnv("AUTH_APP_NAME_1", "");
    vi.stubEnv("AUTH_USER_2", "outra");
    vi.stubEnv("AUTH_PASS_2", "senha-2");
    vi.stubEnv("AUTH_TENANT_2", "tenant-b");
    vi.stubEnv("AUTH_APP_NAME_2", "Outra Loja");
    cookiesMock.token = undefined;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  describe("credenciaisValidas", () => {
    it("aceita usuario sem diferenciar maiusculas e devolve o tenant da conta", () => {
      expect(credenciaisValidas(" LOJA ", "senha-1")).toEqual({
        username: "loja",
        tenantId: "tenant-a",
        appName: "loja",
      });
    });

    it("recusa senha de outra conta", () => {
      expect(credenciaisValidas("loja", "senha-2")).toBeNull();
    });

    it("le a segunda conta pelas variaveis com sufixo _2", () => {
      expect(credenciaisValidas("outra", "senha-2")?.tenantId).toBe("tenant-b");
    });
  });

  describe("sessao", () => {
    it("o token gerado no login abre a sessao com o tenant certo", async () => {
      cookiesMock.token = criarTokenParaUsuario("outra");
      expect(await getOptionalSession()).toEqual({
        username: "outra",
        tenantId: "tenant-b",
        appName: "Outra Loja",
      });
    });

    it("recusa token com conteudo alterado", async () => {
      const [, assinatura] = criarTokenParaUsuario("outra").split(".");
      const payloadForjado = Buffer.from(
        JSON.stringify({ u: "loja", exp: Math.floor(Date.now() / 1000) + 3600 }),
      ).toString("base64url");
      cookiesMock.token = `${payloadForjado}.${assinatura}`;

      expect(await getOptionalSession()).toBeNull();
    });

    it("recusa token assinado com outro segredo", async () => {
      cookiesMock.token = criarTokenParaUsuario("loja");
      vi.stubEnv("AUTH_SESSION_SECRET", "outro-segredo");

      expect(await getOptionalSession()).toBeNull();
    });

    it("recusa token expirado (12h)", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-10-16T08:00:00Z"));
      cookiesMock.token = criarTokenParaUsuario("loja");

      vi.setSystemTime(new Date("2026-10-16T20:01:00Z"));
      expect(await getOptionalSession()).toBeNull();
    });

    it("recusa token de conta que foi removida", async () => {
      cookiesMock.token = criarTokenParaUsuario("outra");
      vi.stubEnv("AUTH_USER_2", "");

      expect(await getOptionalSession()).toBeNull();
    });

    it("requireSession manda para o login quando nao ha sessao", async () => {
      await expect(requireSession()).rejects.toThrow("redirect:/login");
    });

    it("nao gera token sem AUTH_SESSION_SECRET", () => {
      vi.stubEnv("AUTH_SESSION_SECRET", "");
      expect(criarTokenParaUsuario("loja")).toBe("");
    });
  });
});
