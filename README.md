# Estoque App

Aplicação web responsiva para controle de estoque, clientes, pedidos e precificação.

Stack: Next.js 16 (App Router), React 19, Tailwind CSS 4 e Supabase. Hospedada na Vercel, com deploy automático da branch `main`.

## Rodar local

Pré-requisito: Node.js 20 ou mais recente.

```powershell
cd C:\Users\Leo\Projetos\estoque-app
npm install
npm run dev
```

Abra http://localhost:3000. Para testar pelo celular na mesma rede, use `npm run dev -- --hostname 0.0.0.0`.

## Variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha:

| Variável | Para que serve |
| --- | --- |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Acesso ao banco (só no servidor) |
| `AUTH_USER`, `AUTH_PASS`, `AUTH_TENANT_1`, `AUTH_APP_NAME_1` | Conta de login principal |
| `AUTH_USER_2`, `AUTH_PASS_2`, `AUTH_TENANT_2`, `AUTH_APP_NAME_2` | Segunda conta (opcional) |
| `AUTH_SESSION_SECRET` | Assina o cookie de sessão |

Localmente, use sempre o Supabase de **dev**, nunca o de produção. Na Vercel, Production aponta para o banco de produção, enquanto Preview e Development apontam para o de dev.

## Banco de dados

O schema completo está em `supabase/schema.sql` e é idempotente: pode ser executado de novo sem perder dados. Para alterar o schema:

1. Edite `supabase/schema.sql`.
2. Execute no SQL Editor do projeto de **dev** e teste.
3. Depois de validado, execute no projeto de produção.

## Scripts

- `npm run dev` — servidor de desenvolvimento
- `npm run lint` — ESLint
- `npm run build` — build de produção
- `npx tsc --noEmit` — checagem de tipos

## Funcionalidades

- Login com sessão assinada e dados separados por conta (multi-tenant)
- Dashboard
- Clientes, produtos e pedidos: cadastro, edição e exclusão
- Pedidos com baixa automática de estoque, status, data de entrega prevista e impressão de comanda
- Precificação: ingredientes, custos base e custo por produto
- Tema claro/escuro
