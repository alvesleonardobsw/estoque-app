import { randomBytes, randomUUID } from "node:crypto";
import { loadEnvConfig } from "@next/env";
import { defineConfig, devices } from "@playwright/test";
import { PREFIXO_TENANT, urlDoBancoDev } from "./tests/db/helpers";

// Testes de tela (`npm run test:e2e`) contra um `next dev` proprio na porta 3100,
// ligado ao Supabase DEV. Fora do `npm run build`.
loadEnvConfig(process.cwd());
urlDoBancoDev(); // recusa rodar se o .env.local nao apontar para o projeto dev

// Conta de login e tenant proprios, novos a cada execucao: os testes nao usam as contas
// reais nem os dados delas. Este arquivo roda de novo em cada worker; os workers herdam
// o process.env do processo principal, entao todos enxergam os mesmos valores.
process.env.E2E_USUARIO ??= "e2e";
process.env.E2E_SENHA ??= randomBytes(16).toString("hex");
process.env.E2E_TENANT ??= `${PREFIXO_TENANT}e2e-${randomUUID()}`;
process.env.E2E_SEGREDO_SESSAO ??= randomBytes(32).toString("hex");

const PORTA = 3100;

export default defineConfig({
  testDir: "tests/e2e",
  globalSetup: "tests/e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL: `http://localhost:${PORTA}`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npx next dev -p ${PORTA}`,
    url: `http://localhost:${PORTA}/login`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      // Pasta separada para nao disputar a .next com o `npm run dev`.
      NEXT_DIST_DIR: ".next-e2e",
      AUTH_USER: process.env.E2E_USUARIO,
      AUTH_PASS: process.env.E2E_SENHA,
      AUTH_TENANT_1: process.env.E2E_TENANT,
      AUTH_APP_NAME_1: "Testes E2E",
      AUTH_SESSION_SECRET: process.env.E2E_SEGREDO_SESSAO,
    },
  },
});
