# Estoque App

Aplicacao web responsiva para controle de estoque, pedidos e clientes.

## 1) Rodar local

No Windows (PowerShell), use:

```powershell
cd "C:\Users\Leo\Documents\New project\estoque-app"
$env:Path = "C:\Program Files\nodejs;" + [System.Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path','User')
& "C:\Program Files\nodejs\npm.cmd" install
& "C:\Program Files\nodejs\npm.cmd" run dev -- --hostname 0.0.0.0
```

Abra `http://localhost:3000`.

## 2) Criar projeto no Supabase

1. Acesse [https://supabase.com](https://supabase.com) e crie um projeto.
2. No menu do projeto, abra `SQL Editor`.
3. Cole e execute o SQL do arquivo:
   - `supabase/schema.sql`
4. Sempre que adicionarmos novas tabelas no projeto, execute novamente esse arquivo (ele usa `if not exists`).

## 3) Configurar variaveis de ambiente

1. Crie um arquivo `.env.local` na raiz do projeto.
2. Copie o conteudo de `.env.example`.
3. Preencha com os valores do Supabase:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Exemplo:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon
```

## 4) Funcionalidades prontas

- Layout responsivo (desktop e celular)
- Paginas base: Dashboard, Clientes, Produtos e Pedidos
- CRUD inicial de Clientes:
  - listar clientes
  - cadastrar cliente
- CRUD inicial de Produtos:
  - listar produtos
  - cadastrar produto
- Pedidos com baixa automatica de estoque:
  - selecionar cliente
  - adicionar itens no pedido
  - reduzir estoque automaticamente ao confirmar pedido

## 5) Proximo passo sugerido

Implementar autenticacao (login) e perfis de acesso (admin/operador).
