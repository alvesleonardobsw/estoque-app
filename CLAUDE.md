@AGENTS.md

# estoque-app

Controle de estoque, clientes, pedidos e precificação. Next.js 16 (App Router) + React 19 + Tailwind 4 + Supabase. Deploy automático da `main` na Vercel.

## Comandos

- `npm run dev` — dev server em http://localhost:3000 (também em `.claude/launch.json`)
- `npm run lint` — ESLint (precisa passar sem erros antes de commitar)
- `npx tsc --noEmit` — checagem de tipos
- `npm test` — testes (Vitest); `npm run test:watch` para rodar enquanto edita
- `npm run build` — roda os testes e depois o build de produção (teste falhando barra o deploy na Vercel)

## Arquitetura

- `src/app/(app)/` — páginas autenticadas; cada módulo tem `page.tsx` (server), `*-form.tsx` (client) e `actions.ts` (server actions).
- `src/app/login/` e `src/lib/auth.ts` — login próprio por variáveis de ambiente (`AUTH_USER`/`AUTH_PASS`, contas extras com sufixo `_2`), cookie assinado com HMAC (`AUTH_SESSION_SECRET`). Não usa Supabase Auth.
- Multi-tenant: toda consulta filtra por `tenant_id`, vindo da sessão (`AUTH_TENANT_*`). Nunca remova esse filtro.
- `src/lib/supabase.ts` — cliente com service role, **só no servidor**. Nada de Supabase no client.
- `supabase/schema.sql` — schema completo e idempotente (`if not exists`). Operações de pedido/estoque são funções SQL (`registrar_pedido`, `atualizar_pedido` etc.) chamadas via `rpc`.

## Ambientes

- Supabase **produção** (`lzcdamjvvcmmgulvrovy`): dados reais. Só leitura, salvo pedido explícito.
- Supabase **dev** (`ydjukidzicerxjhlrutk`): usado por Preview e pelo `.env.local`. Teste mudanças de banco aqui primeiro.
- Mudança de schema é feita por migration (Supabase CLI, `npx supabase ...`). As migrations em `supabase/migrations/` são a fonte da verdade.
  1. `npx supabase migration new <nome>` e escreva o SQL.
  2. Aplique no dev (`npx supabase link --project-ref ydjukidzicerxjhlrutk` + `npx supabase db push`) e teste.
  3. Com aprovação do usuário: link na produção (`lzcdamjvvcmmgulvrovy`), `db push` e volte o link para o dev.
  4. Reflita a mudança em `supabase/schema.sql` (cópia de referência do schema completo).
- O link padrão da CLI é o dev. Sempre confira `supabase/.temp/project-ref` antes de um `db push`.

## Testes

- Vitest, ambiente Node, sempre em UTC (como a Vercel). Testes ficam ao lado do código: `src/lib/x.ts` → `src/lib/x.test.ts`.
- Lógica testável vai para funções puras em `src/lib/`; `page.tsx` e `actions.ts` só buscam dados e chamam essas funções. Se a lógica de um bug está presa numa página ou action, extraia para `src/lib/` antes de testar.
- Os testes não acessam o Supabase nem a rede. Use `vi.mock` para `next/headers`, `next/navigation` etc. (veja `src/lib/auth.test.ts`).
- **Todo bug corrigido (`fix(...)`) vem com teste de regressão no mesmo commit:**
  1. Escreva primeiro o teste que reproduz o bug e confirme que ele **falha** com o código antigo.
  2. Corrija e confirme que passa (`npm test`).
  3. Nomeie o caso `regressao: <comportamento esperado>` e coloque acima um comentário com o escopo do commit e o que acontecia, ex.: `// Regressao: fix(produtos). Filtro de sabor + peso trazia produtos de outros pesos.`
- Se o bug não for testável em unitário (comportamento de tela, função SQL), diga isso no commit e explique como foi verificado.

## Convenções

- Código, UI e commits em português. Commits no formato `tipo(escopo): descrição` (ex.: `feat(pedidos): ...`).
- Nunca commite `.env*` nem leia/exiba segredos de `.env.local*`.
