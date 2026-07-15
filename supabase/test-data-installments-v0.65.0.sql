-- Dados temporários de teste: altera somente três parcelas pendentes do usuário "teste".
-- Execute somente depois de migration-installment-date-test-v0.65.0.sql.

do $$
declare
  v_usuario_id uuid;
begin
  select id into v_usuario_id
    from public.usuarios
   where lower(btrim(usuario)) = 'teste'
     and perfil = 'usuario'
   limit 1;

  if v_usuario_id is null then
    raise exception 'Usuário teste não encontrado.';
  end if;

  perform set_config('meu_bolso.edicao_vencimento_parcela', 'permitida', true);

  with candidatas as (
    select p.id,
           row_number() over (order by p.data_vencimento, p.numero, p.id) as ordem
      from public.parcelas p
      join public.compras_cartao c
        on c.id = p.compra_cartao_id
       and c.usuario_id = p.usuario_id
     where p.usuario_id = v_usuario_id
       and p.status <> 'pago'
     order by p.data_vencimento, p.numero, p.id
     limit 3
  )
  update public.parcelas p
     set data_vencimento = case c.ordem
       when 1 then current_date - 5
       when 2 then current_date - 30
       else (date_trunc('month', current_date)::date - 5)
     end,
         status = 'atrasado',
         atualizado_em = now()
    from candidatas c
   where p.id = c.id
     and p.usuario_id = v_usuario_id
     and p.status <> 'pago';
end;
$$;

select p.id,
       c.nome as compra,
       p.numero,
       p.valor,
       p.data_vencimento,
       p.status
  from public.parcelas p
  join public.compras_cartao c on c.id = p.compra_cartao_id
  join public.usuarios u on u.id = p.usuario_id
 where lower(btrim(u.usuario)) = 'teste'
 order by p.data_vencimento, p.numero;
