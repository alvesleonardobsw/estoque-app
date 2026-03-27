create extension if not exists pgcrypto;

create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  telefone text,
  endereco text,
  created_at timestamptz not null default now()
);

alter table public.clientes enable row level security;

drop policy if exists "Permitir leitura de clientes" on public.clientes;
create policy "Permitir leitura de clientes"
on public.clientes
for select
to anon
using (true);

drop policy if exists "Permitir criacao de clientes" on public.clientes;
create policy "Permitir criacao de clientes"
on public.clientes
for insert
to anon
with check (true);

drop policy if exists "Permitir atualizacao de clientes" on public.clientes;
create policy "Permitir atualizacao de clientes"
on public.clientes
for update
to anon
using (true)
with check (true);

drop policy if exists "Permitir exclusao de clientes" on public.clientes;
create policy "Permitir exclusao de clientes"
on public.clientes
for delete
to anon
using (true);

create table if not exists public.produtos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  preco numeric(10, 2) not null check (preco >= 0),
  estoque_atual integer not null default 0 check (estoque_atual >= 0),
  created_at timestamptz not null default now()
);

alter table public.produtos enable row level security;

drop policy if exists "Permitir leitura de produtos" on public.produtos;
create policy "Permitir leitura de produtos"
on public.produtos
for select
to anon
using (true);

drop policy if exists "Permitir criacao de produtos" on public.produtos;
create policy "Permitir criacao de produtos"
on public.produtos
for insert
to anon
with check (true);

drop policy if exists "Permitir atualizacao de produtos" on public.produtos;
create policy "Permitir atualizacao de produtos"
on public.produtos
for update
to anon
using (true)
with check (true);

drop policy if exists "Permitir exclusao de produtos" on public.produtos;
create policy "Permitir exclusao de produtos"
on public.produtos
for delete
to anon
using (true);

create table if not exists public.pedidos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id),
  total numeric(12, 2) not null default 0 check (total >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.pedido_itens (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.pedidos (id) on delete cascade,
  produto_id uuid not null references public.produtos (id),
  quantidade integer not null check (quantidade > 0),
  preco_unitario numeric(10, 2) not null check (preco_unitario >= 0),
  subtotal numeric(12, 2) not null check (subtotal >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.estoque_movimentos (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references public.produtos (id),
  pedido_id uuid references public.pedidos (id) on delete set null,
  tipo text not null check (tipo in ('entrada', 'saida')),
  quantidade integer not null check (quantidade > 0),
  observacao text,
  created_at timestamptz not null default now()
);

alter table public.pedidos enable row level security;
alter table public.pedido_itens enable row level security;
alter table public.estoque_movimentos enable row level security;

drop policy if exists "Permitir leitura de pedidos" on public.pedidos;
create policy "Permitir leitura de pedidos"
on public.pedidos
for select
to anon
using (true);

drop policy if exists "Permitir leitura de pedido_itens" on public.pedido_itens;
create policy "Permitir leitura de pedido_itens"
on public.pedido_itens
for select
to anon
using (true);

drop policy if exists "Permitir leitura de estoque_movimentos" on public.estoque_movimentos;
create policy "Permitir leitura de estoque_movimentos"
on public.estoque_movimentos
for select
to anon
using (true);

create or replace function public.registrar_pedido(p_cliente_id uuid, p_itens jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pedido_id uuid;
  v_item jsonb;
  v_produto_id uuid;
  v_quantidade integer;
  v_preco numeric(10, 2);
  v_estoque integer;
  v_total numeric(12, 2) := 0;
begin
  if p_cliente_id is null then
    raise exception 'Cliente invalido.';
  end if;

  if p_itens is null
    or jsonb_typeof(p_itens) <> 'array'
    or jsonb_array_length(p_itens) = 0 then
    raise exception 'Informe ao menos um item no pedido.';
  end if;

  insert into public.pedidos (cliente_id, total)
  values (p_cliente_id, 0)
  returning id into v_pedido_id;

  for v_item in
    select value from jsonb_array_elements(p_itens)
  loop
    v_produto_id := (v_item ->> 'produto_id')::uuid;
    v_quantidade := (v_item ->> 'quantidade')::integer;

    if v_produto_id is null or v_quantidade is null or v_quantidade <= 0 then
      raise exception 'Item de pedido invalido.';
    end if;

    select preco, estoque_atual
    into v_preco, v_estoque
    from public.produtos
    where id = v_produto_id
    for update;

    if not found then
      raise exception 'Produto nao encontrado.';
    end if;

    if v_estoque < v_quantidade then
      raise exception 'Estoque insuficiente para o produto selecionado.';
    end if;

    update public.produtos
    set estoque_atual = estoque_atual - v_quantidade
    where id = v_produto_id;

    insert into public.pedido_itens (
      pedido_id,
      produto_id,
      quantidade,
      preco_unitario,
      subtotal
    )
    values (
      v_pedido_id,
      v_produto_id,
      v_quantidade,
      v_preco,
      v_preco * v_quantidade
    );

    insert into public.estoque_movimentos (
      produto_id,
      pedido_id,
      tipo,
      quantidade,
      observacao
    )
    values (
      v_produto_id,
      v_pedido_id,
      'saida',
      v_quantidade,
      'Baixa automatica por pedido'
    );

    v_total := v_total + (v_preco * v_quantidade);
  end loop;

  update public.pedidos
  set total = v_total
  where id = v_pedido_id;

  return v_pedido_id;
end;
$$;

grant execute on function public.registrar_pedido(uuid, jsonb) to anon;
