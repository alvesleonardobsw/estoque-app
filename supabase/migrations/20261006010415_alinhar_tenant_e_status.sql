-- Alinha dev e produção, que divergiram porque a produção foi montada aos poucos.
--
-- 1. tenant_id sem valor padrão: o app sempre informa o tenant. Um padrão fixo
--    ('ledaempadas') faria um insert sem tenant cair silenciosamente nessa conta.
-- 2. pedidos.status só aceita 'pendente' ou 'entregue' (a produção não tinha o check).

alter table public.clientes alter column tenant_id drop default;
alter table public.produtos alter column tenant_id drop default;
alter table public.pedidos alter column tenant_id drop default;
alter table public.pedido_itens alter column tenant_id drop default;
alter table public.estoque_movimentos alter column tenant_id drop default;
alter table public.precificacao_produtos alter column tenant_id drop default;
alter table public.precificacao_ingredientes alter column tenant_id drop default;
alter table public.precificacao_custos_base alter column tenant_id drop default;

alter table public.pedidos drop constraint if exists pedidos_status_check;
alter table public.pedidos
  add constraint pedidos_status_check check (status in ('pendente', 'entregue'));
