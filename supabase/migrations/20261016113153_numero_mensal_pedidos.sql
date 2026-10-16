-- Numero do pedido sequencial dentro do mes (por tenant), reiniciando a cada mes.
-- O mes considerado e o da criacao do pedido, no fuso de Sao Paulo.

alter table public.pedidos
  add column if not exists numero integer;

create index if not exists idx_pedidos_tenant_created_at on public.pedidos (tenant_id, created_at);

update public.pedidos p
set numero = x.numero
from (
  select
    id,
    row_number() over (
      partition by tenant_id, date_trunc('month', created_at at time zone 'America/Sao_Paulo')
      order by created_at, id
    ) as numero
  from public.pedidos
) x
where p.id = x.id
  and p.numero is null;

create or replace function public.definir_numero_pedido()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_inicio_mes timestamp;
begin
  if new.numero is not null then
    return new;
  end if;

  v_inicio_mes := date_trunc('month', coalesce(new.created_at, now()) at time zone 'America/Sao_Paulo');

  -- Serializa a numeracao do mesmo tenant/mes para evitar numeros repetidos.
  perform pg_advisory_xact_lock(hashtext('pedidos_numero:' || new.tenant_id || ':' || v_inicio_mes::text));

  select coalesce(max(numero), 0) + 1
  into new.numero
  from public.pedidos
  where tenant_id = new.tenant_id
    and created_at >= v_inicio_mes at time zone 'America/Sao_Paulo'
    and created_at < (v_inicio_mes + interval '1 month') at time zone 'America/Sao_Paulo';

  return new;
end;
$$;

revoke execute on function public.definir_numero_pedido() from public, anon, authenticated;

drop trigger if exists trg_definir_numero_pedido on public.pedidos;

create trigger trg_definir_numero_pedido
  before insert on public.pedidos
  for each row
  execute function public.definir_numero_pedido();

alter table public.pedidos
  alter column numero set not null;
