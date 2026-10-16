import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Os testes de tela (Playwright) sobem um servidor proprio em .next-e2e para nao
  // disputar a pasta .next com o `npm run dev`.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
