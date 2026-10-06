-- Produtos com preço definido no pedido (ex.: empadão na travessa, cobrado pelo peso).
--
-- 1. produtos.preco_variavel: quando true, o preço vem de cada item do pedido
--    (campo preco_unitario no JSON de itens) em vez de produtos.preco.
-- 2. Esses produtos são feitos sob encomenda e não controlam estoque: a entrega,
--    a volta para pendente, a edição e a exclusão de pedidos não movimentam
--    o estoque deles.

alter table public.produtos
  add column if not exists preco_variavel boolean not null default false;

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
  v_preco_variavel boolean;
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

    select preco, preco_variavel
    into v_preco, v_preco_variavel
    from public.produtos
    where id = v_produto_id
      and tenant_id = p_tenant_id
    limit 1;

    if not found then
      raise exception 'Produto nao encontrado.';
    end if;

    if v_preco_variavel then
      v_preco := nullif(v_item ->> 'preco_unitario', '')::numeric(10, 2);
      if v_preco is null or v_preco <= 0 then
        raise exception 'Informe o valor dos itens com preco definido no pedido.';
      end if;
    end if;

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

    v_total := v_total + (v_preco * v_quantidade);
  end loop;

  update public.pedidos
  set total = v_total
  where id = v_pedido_id
    and tenant_id = p_tenant_id;

  return v_pedido_id;
end;
$$;

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
  v_preco_variavel boolean;
  v_total numeric(12, 2) := 0;
  v_item_antigo record;
  v_status_atual text;
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

  select status
  into v_status_atual
  from public.pedidos
  where id = p_pedido_id
    and tenant_id = p_tenant_id;

  if v_status_atual = 'entregue' then
    for v_item_antigo in
      select pi.produto_id, pi.quantidade
      from public.pedido_itens pi
      join public.produtos pr on pr.id = pi.produto_id
      where pi.pedido_id = p_pedido_id
        and pi.tenant_id = p_tenant_id
        and not pr.preco_variavel
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
        'Devolucao por alteracao de pedido entregue'
      );
    end loop;
  end if;

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

    select preco, preco_variavel
    into v_preco, v_preco_variavel
    from public.produtos
    where id = v_produto_id
      and tenant_id = p_tenant_id
    limit 1;

    if not found then
      raise exception 'Produto nao encontrado.';
    end if;

    if v_preco_variavel then
      v_preco := nullif(v_item ->> 'preco_unitario', '')::numeric(10, 2);
      if v_preco is null or v_preco <= 0 then
        raise exception 'Informe o valor dos itens com preco definido no pedido.';
      end if;
    end if;

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

    v_total := v_total + (v_preco * v_quantidade);
  end loop;

  if v_status_atual = 'entregue' then
    for v_item_antigo in
      select pi.produto_id, pi.quantidade
      from public.pedido_itens pi
      join public.produtos pr on pr.id = pi.produto_id
      where pi.pedido_id = p_pedido_id
        and pi.tenant_id = p_tenant_id
        and not pr.preco_variavel
    loop
      update public.produtos
      set estoque_atual = estoque_atual - v_item_antigo.quantidade
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
        'saida',
        v_item_antigo.quantidade,
        'Baixa por alteracao de pedido entregue'
      );
    end loop;
  end if;

  update public.pedidos
  set cliente_id = p_cliente_id,
      total = v_total
  where id = p_pedido_id
    and tenant_id = p_tenant_id;

  return p_pedido_id;
end;
$$;

create or replace function public.excluir_pedido(p_tenant_id text, p_pedido_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item record;
  v_status_atual text;
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

  select status
  into v_status_atual
  from public.pedidos
  where id = p_pedido_id
    and tenant_id = p_tenant_id;

  if v_status_atual = 'entregue' then
    for v_item in
      select pi.produto_id, pi.quantidade
      from public.pedido_itens pi
      join public.produtos pr on pr.id = pi.produto_id
      where pi.pedido_id = p_pedido_id
        and pi.tenant_id = p_tenant_id
        and not pr.preco_variavel
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
        'Devolucao por exclusao de pedido entregue'
      );
    end loop;
  end if;

  delete from public.pedidos
  where id = p_pedido_id
    and tenant_id = p_tenant_id;

  return true;
end;
$$;

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
declare
  v_status_atual text;
  v_item record;
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

  select status
  into v_status_atual
  from public.pedidos
  where id = p_pedido_id
    and tenant_id = p_tenant_id
  for update;

  if not found then
    raise exception 'Pedido nao encontrado.';
  end if;

  if v_status_atual <> p_status then
    if v_status_atual = 'pendente' and p_status = 'entregue' then
      for v_item in
        select pi.produto_id, pi.quantidade
        from public.pedido_itens pi
        join public.produtos pr on pr.id = pi.produto_id
        where pi.pedido_id = p_pedido_id
          and pi.tenant_id = p_tenant_id
          and not pr.preco_variavel
      loop
        update public.produtos
        set estoque_atual = estoque_atual - v_item.quantidade
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
          'saida',
          v_item.quantidade,
          'Baixa por entrega de pedido'
        );
      end loop;
    elsif v_status_atual = 'entregue' and p_status = 'pendente' then
      for v_item in
        select pi.produto_id, pi.quantidade
        from public.pedido_itens pi
        join public.produtos pr on pr.id = pi.produto_id
        where pi.pedido_id = p_pedido_id
          and pi.tenant_id = p_tenant_id
          and not pr.preco_variavel
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
          'Devolucao por retorno do pedido para pendente'
        );
      end loop;
    end if;
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

  return p_pedido_id;
end;
$$;

-- create or replace mantém os grants, mas reforçamos para não depender disso.
revoke execute on function public.registrar_pedido(text, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.registrar_pedido(text, uuid, jsonb) to service_role;
revoke execute on function public.atualizar_pedido(text, uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.atualizar_pedido(text, uuid, uuid, jsonb) to service_role;
revoke execute on function public.excluir_pedido(text, uuid) from public, anon, authenticated;
grant execute on function public.excluir_pedido(text, uuid) to service_role;
revoke execute on function public.atualizar_status_pedido(text, uuid, text) from public, anon, authenticated;
grant execute on function public.atualizar_status_pedido(text, uuid, text) to service_role;
