import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Roda os testes em UTC, como na Vercel, para que bugs de fuso horario
// aparecam aqui mesmo quando a maquina local esta em America/Sao_Paulo.
process.env.TZ = "UTC";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
