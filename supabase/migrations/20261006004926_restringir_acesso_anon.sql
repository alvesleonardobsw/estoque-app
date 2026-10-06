-- O app acessa o banco só pelo servidor com service_role (que ignora RLS).
-- Remove o acesso público (anon/authenticated) a funções e tabelas.

do $$
declare
  f regprocedure;
begin
  for f in
    select p.oid::regprocedure
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'registrar_pedido', 'atualizar_pedido', 'excluir_pedido',
        'atualizar_data_entrega_prevista_pedido', 'atualizar_status_pedido',
        'salvar_produto_precificacao', 'salvar_custo_base_precificacao',
        'excluir_custo_base_precificacao', 'excluir_produto_precificacao'
      )
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;

drop policy if exists "Permitir leitura de clientes" on public.clientes;
drop policy if exists "Permitir criacao de clientes" on public.clientes;
drop policy if exists "Permitir atualizacao de clientes" on public.clientes;
drop policy if exists "Permitir exclusao de clientes" on public.clientes;
drop policy if exists "Permitir leitura de produtos" on public.produtos;
drop policy if exists "Permitir criacao de produtos" on public.produtos;
drop policy if exists "Permitir atualizacao de produtos" on public.produtos;
drop policy if exists "Permitir exclusao de produtos" on public.produtos;
drop policy if exists "Permitir leitura de pedidos" on public.pedidos;
drop policy if exists "Permitir leitura de pedido_itens" on public.pedido_itens;
drop policy if exists "Permitir leitura de estoque_movimentos" on public.estoque_movimentos;
drop policy if exists "Permitir leitura de precificacao_produtos" on public.precificacao_produtos;
drop policy if exists "Permitir leitura de precificacao_ingredientes" on public.precificacao_ingredientes;
drop policy if exists "Permitir leitura de precificacao_custos_base" on public.precificacao_custos_base;
