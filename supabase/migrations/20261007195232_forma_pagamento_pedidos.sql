-- Forma de pagamento do pedido (opcional; pedidos antigos ficam sem).

alter table public.pedidos
  add column if not exists forma_pagamento text;

alter table public.pedidos
  drop constraint if exists pedidos_forma_pagamento_check;

alter table public.pedidos
  add constraint pedidos_forma_pagamento_check
  check (forma_pagamento is null or forma_pagamento in ('pix', 'dinheiro', 'credito', 'debito'));

create or replace function public.atualizar_forma_pagamento_pedido(
  p_tenant_id text,
  p_pedido_id uuid,
  p_forma_pagamento text
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
  set forma_pagamento = p_forma_pagamento
  where id = p_pedido_id
    and tenant_id = p_tenant_id;

  if not found then
    raise exception 'Pedido nao encontrado.';
  end if;

  return p_pedido_id;
end;
$$;

revoke execute on function public.atualizar_forma_pagamento_pedido(text, uuid, text) from public, anon, authenticated;
grant execute on function public.atualizar_forma_pagamento_pedido(text, uuid, text) to service_role;
