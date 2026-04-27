create extension if not exists pgcrypto;

create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null default 'ledaempadas',
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
  tenant_id text not null default 'ledaempadas',
  nome text not null,
  sabor text not null default 'frango',
  preco numeric(10, 2) not null check (preco >= 0),
  ativo boolean not null default true,
  estoque_atual integer not null default 0 check (estoque_atual >= 0),
  created_at timestamptz not null default now()
);

alter table public.produtos
  add column if not exists ativo boolean not null default true;

alter table public.produtos
  add column if not exists sabor text;

update public.produtos
set sabor = 'frango'
where sabor is null;

alter table public.produtos
  alter column sabor set default 'frango';

alter table public.produtos
  alter column sabor set not null;

alter table public.produtos
  drop constraint if exists produtos_sabor_check;

alter table public.produtos
  add constraint produtos_sabor_check
  check (sabor in ('frango', 'carne', 'palmito', 'calabresa', 'camarao'));

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
  tenant_id text not null default 'ledaempadas',
  cliente_id uuid not null references public.clientes (id),
  status text not null default 'pendente' check (status in ('pendente', 'entregue')),
  data_entrega_prevista date,
  data_entrega timestamptz,
  total numeric(12, 2) not null default 0 check (total >= 0),
  created_at timestamptz not null default now()
);

alter table public.pedidos
  add column if not exists status text not null default 'pendente';

alter table public.pedidos
  add column if not exists data_entrega timestamptz;

alter table public.pedidos
  add column if not exists data_entrega_prevista date;

create table if not exists public.pedido_itens (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null default 'ledaempadas',
  pedido_id uuid not null references public.pedidos (id) on delete cascade,
  produto_id uuid not null references public.produtos (id),
  quantidade integer not null check (quantidade > 0),
  preco_unitario numeric(10, 2) not null check (preco_unitario >= 0),
  subtotal numeric(12, 2) not null check (subtotal >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.estoque_movimentos (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null default 'ledaempadas',
  produto_id uuid not null references public.produtos (id),
  pedido_id uuid references public.pedidos (id) on delete set null,
  tipo text not null check (tipo in ('entrada', 'saida')),
  quantidade integer not null check (quantidade > 0),
  observacao text,
  created_at timestamptz not null default now()
);

alter table public.clientes
  add column if not exists tenant_id text;

update public.clientes
set tenant_id = 'ledaempadas'
where tenant_id is null or btrim(tenant_id) = '';

alter table public.clientes
  alter column tenant_id set not null;

alter table public.produtos
  add column if not exists tenant_id text;

update public.produtos
set tenant_id = 'ledaempadas'
where tenant_id is null or btrim(tenant_id) = '';

alter table public.produtos
  alter column tenant_id set not null;

alter table public.pedidos
  add column if not exists tenant_id text;

update public.pedidos
set tenant_id = 'ledaempadas'
where tenant_id is null or btrim(tenant_id) = '';

alter table public.pedidos
  alter column tenant_id set not null;

alter table public.pedido_itens
  add column if not exists tenant_id text;

update public.pedido_itens pi
set tenant_id = p.tenant_id
from public.pedidos p
where pi.pedido_id = p.id
  and (pi.tenant_id is null or btrim(pi.tenant_id) = '');

update public.pedido_itens
set tenant_id = 'ledaempadas'
where tenant_id is null or btrim(tenant_id) = '';

alter table public.pedido_itens
  alter column tenant_id set not null;

alter table public.estoque_movimentos
  add column if not exists tenant_id text;

update public.estoque_movimentos em
set tenant_id = coalesce(
  (select p.tenant_id from public.pedidos p where p.id = em.pedido_id),
  (select pr.tenant_id from public.produtos pr where pr.id = em.produto_id),
  'ledaempadas'
)
where em.tenant_id is null or btrim(em.tenant_id) = '';

update public.estoque_movimentos
set tenant_id = 'ledaempadas'
where tenant_id is null or btrim(tenant_id) = '';

alter table public.estoque_movimentos
  alter column tenant_id set not null;

create index if not exists idx_clientes_tenant_id on public.clientes (tenant_id);
create index if not exists idx_produtos_tenant_id on public.produtos (tenant_id);
create index if not exists idx_pedidos_tenant_id on public.pedidos (tenant_id);
create index if not exists idx_pedido_itens_tenant_id on public.pedido_itens (tenant_id);
create index if not exists idx_estoque_movimentos_tenant_id on public.estoque_movimentos (tenant_id);

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

drop function if exists public.registrar_pedido(uuid, jsonb);

create or replace function public.registrar_pedido(p_tenant_id text, p_cliente_id uuid, p_itens jsonb)
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
  if p_tenant_id is null or btrim(p_tenant_id) = '' then
    raise exception 'Tenant invalido.';
  end if;

  if p_cliente_id is null then
    raise exception 'Cliente invalido.';
  end if;

  if p_itens is null
    or jsonb_typeof(p_itens) <> 'array'
    or jsonb_array_length(p_itens) = 0 then
    raise exception 'Informe ao menos um item no pedido.';
  end if;

  perform 1
  from public.clientes
  where id = p_cliente_id
    and tenant_id = p_tenant_id;

  if not found then
    raise exception 'Cliente nao encontrado para esta conta.';
  end if;

  insert into public.pedidos (tenant_id, cliente_id, total)
  values (p_tenant_id, p_cliente_id, 0)
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
      and tenant_id = p_tenant_id
    for update;

    if not found then
      raise exception 'Produto nao encontrado.';
    end if;

    if v_estoque < v_quantidade then
      raise exception 'Estoque insuficiente para o produto selecionado.';
    end if;

    update public.produtos
    set estoque_atual = estoque_atual - v_quantidade
    where id = v_produto_id
      and tenant_id = p_tenant_id;

    insert into public.pedido_itens (
      pedido_id,
      tenant_id,
      produto_id,
      quantidade,
      preco_unitario,
      subtotal
    )
    values (
      v_pedido_id,
      p_tenant_id,
      v_produto_id,
      v_quantidade,
      v_preco,
      v_preco * v_quantidade
    );

    insert into public.estoque_movimentos (
      produto_id,
      pedido_id,
      tenant_id,
      tipo,
      quantidade,
      observacao
    )
    values (
      v_produto_id,
      v_pedido_id,
      p_tenant_id,
      'saida',
      v_quantidade,
      'Baixa automatica por pedido'
    );

    v_total := v_total + (v_preco * v_quantidade);
  end loop;

  update public.pedidos
  set total = v_total
  where id = v_pedido_id
    and tenant_id = p_tenant_id;

  return v_pedido_id;
end;
$$;

grant execute on function public.registrar_pedido(text, uuid, jsonb) to anon;

drop function if exists public.atualizar_pedido(uuid, uuid, jsonb);

create or replace function public.atualizar_pedido(
  p_tenant_id text,
  p_pedido_id uuid,
  p_cliente_id uuid,
  p_itens jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item jsonb;
  v_produto_id uuid;
  v_quantidade integer;
  v_preco numeric(10, 2);
  v_estoque integer;
  v_total numeric(12, 2) := 0;
  v_item_antigo record;
begin
  if p_tenant_id is null or btrim(p_tenant_id) = '' then
    raise exception 'Tenant invalido.';
  end if;

  if p_pedido_id is null then
    raise exception 'Pedido invalido.';
  end if;

  if p_cliente_id is null then
    raise exception 'Cliente invalido.';
  end if;

  if p_itens is null
    or jsonb_typeof(p_itens) <> 'array'
    or jsonb_array_length(p_itens) = 0 then
    raise exception 'Informe ao menos um item no pedido.';
  end if;

  perform 1
  from public.clientes
  where id = p_cliente_id
    and tenant_id = p_tenant_id;

  if not found then
    raise exception 'Cliente nao encontrado para esta conta.';
  end if;

  perform 1
  from public.pedidos
  where id = p_pedido_id
    and tenant_id = p_tenant_id
  for update;

  if not found then
    raise exception 'Pedido nao encontrado.';
  end if;

  for v_item_antigo in
    select produto_id, quantidade
    from public.pedido_itens
    where pedido_id = p_pedido_id
      and tenant_id = p_tenant_id
  loop
    update public.produtos
    set estoque_atual = estoque_atual + v_item_antigo.quantidade
    where id = v_item_antigo.produto_id
      and tenant_id = p_tenant_id;

    insert into public.estoque_movimentos (
      produto_id,
      pedido_id,
      tenant_id,
      tipo,
      quantidade,
      observacao
    )
    values (
      v_item_antigo.produto_id,
      p_pedido_id,
      p_tenant_id,
      'entrada',
      v_item_antigo.quantidade,
      'Devolucao por alteracao de pedido'
    );
  end loop;

  delete from public.pedido_itens
  where pedido_id = p_pedido_id
    and tenant_id = p_tenant_id;

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
      and tenant_id = p_tenant_id
    for update;

    if not found then
      raise exception 'Produto nao encontrado.';
    end if;

    if v_estoque < v_quantidade then
      raise exception 'Estoque insuficiente para o produto selecionado.';
    end if;

    update public.produtos
    set estoque_atual = estoque_atual - v_quantidade
    where id = v_produto_id
      and tenant_id = p_tenant_id;

    insert into public.pedido_itens (
      pedido_id,
      tenant_id,
      produto_id,
      quantidade,
      preco_unitario,
      subtotal
    )
    values (
      p_pedido_id,
      p_tenant_id,
      v_produto_id,
      v_quantidade,
      v_preco,
      v_preco * v_quantidade
    );

    insert into public.estoque_movimentos (
      produto_id,
      pedido_id,
      tenant_id,
      tipo,
      quantidade,
      observacao
    )
    values (
      v_produto_id,
      p_pedido_id,
      p_tenant_id,
      'saida',
      v_quantidade,
      'Baixa por alteracao de pedido'
    );

    v_total := v_total + (v_preco * v_quantidade);
  end loop;

  update public.pedidos
  set cliente_id = p_cliente_id,
      total = v_total
  where id = p_pedido_id
    and tenant_id = p_tenant_id;

  return p_pedido_id;
end;
$$;

grant execute on function public.atualizar_pedido(text, uuid, uuid, jsonb) to anon;

drop function if exists public.excluir_pedido(uuid);

create or replace function public.excluir_pedido(p_tenant_id text, p_pedido_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item record;
begin
  if p_tenant_id is null or btrim(p_tenant_id) = '' then
    raise exception 'Tenant invalido.';
  end if;

  if p_pedido_id is null then
    raise exception 'Pedido invalido.';
  end if;

  perform 1
  from public.pedidos
  where id = p_pedido_id
    and tenant_id = p_tenant_id
  for update;

  if not found then
    raise exception 'Pedido nao encontrado.';
  end if;

  for v_item in
    select produto_id, quantidade
    from public.pedido_itens
    where pedido_id = p_pedido_id
      and tenant_id = p_tenant_id
  loop
    update public.produtos
    set estoque_atual = estoque_atual + v_item.quantidade
    where id = v_item.produto_id
      and tenant_id = p_tenant_id;

    insert into public.estoque_movimentos (
      produto_id,
      pedido_id,
      tenant_id,
      tipo,
      quantidade,
      observacao
    )
    values (
      v_item.produto_id,
      p_pedido_id,
      p_tenant_id,
      'entrada',
      v_item.quantidade,
      'Devolucao por exclusao de pedido'
    );
  end loop;

  delete from public.pedidos
  where id = p_pedido_id
    and tenant_id = p_tenant_id;

  return true;
end;
$$;

grant execute on function public.excluir_pedido(text, uuid) to anon;

drop function if exists public.atualizar_data_entrega_prevista_pedido(uuid, date);

create or replace function public.atualizar_data_entrega_prevista_pedido(
  p_tenant_id text,
  p_pedido_id uuid,
  p_data_entrega_prevista date
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_tenant_id is null or btrim(p_tenant_id) = '' then
    raise exception 'Tenant invalido.';
  end if;

  if p_pedido_id is null then
    raise exception 'Pedido invalido.';
  end if;

  update public.pedidos
  set data_entrega_prevista = p_data_entrega_prevista
  where id = p_pedido_id
    and tenant_id = p_tenant_id;

  if not found then
    raise exception 'Pedido nao encontrado.';
  end if;

  return p_pedido_id;
end;
$$;

grant execute on function public.atualizar_data_entrega_prevista_pedido(text, uuid, date) to anon;

drop function if exists public.atualizar_status_pedido(uuid, text);

create or replace function public.atualizar_status_pedido(
  p_tenant_id text,
  p_pedido_id uuid,
  p_status text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_tenant_id is null or btrim(p_tenant_id) = '' then
    raise exception 'Tenant invalido.';
  end if;

  if p_pedido_id is null then
    raise exception 'Pedido invalido.';
  end if;

  if p_status not in ('pendente', 'entregue') then
    raise exception 'Status invalido.';
  end if;

  update public.pedidos
  set
    status = p_status,
    data_entrega = case
      when p_status = 'entregue' then now()
      else null
    end
  where id = p_pedido_id
    and tenant_id = p_tenant_id;

  if not found then
    raise exception 'Pedido nao encontrado.';
  end if;

  return p_pedido_id;
end;
$$;

grant execute on function public.atualizar_status_pedido(text, uuid, text) to anon;
