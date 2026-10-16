import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

// Testes das funcoes SQL contra o Supabase DEV (`npm run test:db`). Ficam fora do
// `npm run build`: o deploy nao pode depender do banco estar no ar.
// Carrega o .env.local como o `next dev`; variaveis ja definidas no ambiente prevalecem.
for (const [chave, valor] of Object.entries(loadEnv("test", process.cwd(), ""))) {
  process.env[chave] ??= valor;
}

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/db/**/*.test.ts"],
    globalSetup: ["tests/db/global-setup.ts"],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
