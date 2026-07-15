-- MEU BOLSO 0.65.0
-- Edição temporária e protegida do vencimento de parcelas para o usuário "teste".
-- Não cria políticas RLS abertas e não usa USING (true) ou WITH CHECK (true).

create or replace function public.proteger_edicao_direta_vencimento_parcela()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.data_vencimento is distinct from old.data_vencimento
     and coalesce(current_setting('meu_bolso.edicao_vencimento_parcela', true), '') <> 'permitida' then
    raise exception 'A data da parcela deve ser alterada pelo fluxo protegido do MEU BOLSO.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists parcelas_proteger_edicao_vencimento on public.parcelas;
create trigger parcelas_proteger_edicao_vencimento
before update of data_vencimento on public.parcelas
for each row execute function public.proteger_edicao_direta_vencimento_parcela();

create or replace function public.editar_vencimento_parcela_teste(
  p_parcela_id uuid,
  p_usuario_id uuid,
  p_senha text,
  p_nova_data date
)
returns public.parcelas
language plpgsql
security definer
set search_path = public
as $$
declare
  v_parcela public.parcelas%rowtype;
begin
  if p_nova_data is null then
    raise exception 'Nova data inválida.' using errcode = '22007';
  end if;

  if not exists (
    select 1
      from public.usuarios u
     where u.id = p_usuario_id
       and lower(btrim(u.usuario)) = 'teste'
       and u.perfil = 'usuario'
       and u.senha = p_senha
  ) then
    raise exception 'Acesso não autorizado.' using errcode = '42501';
  end if;

  select p.*
    into v_parcela
    from public.parcelas p
    join public.compras_cartao c
      on c.id = p.compra_cartao_id
     and c.usuario_id = p.usuario_id
   where p.id = p_parcela_id
     and p.usuario_id = p_usuario_id
     and c.usuario_id = p_usuario_id
   for update of p;

  if not found then
    raise exception 'Parcela não encontrada para este usuário.' using errcode = 'P0002';
  end if;

  if v_parcela.status = 'pago' then
    raise exception 'Não é possível alterar o vencimento de uma parcela paga.' using errcode = '23514';
  end if;

  perform set_config('meu_bolso.edicao_vencimento_parcela', 'permitida', true);

  update public.parcelas
     set data_vencimento = p_nova_data,
         status = case when p_nova_data < current_date then 'atrasado' else 'pendente' end,
         atualizado_em = now()
   where id = p_parcela_id
     and usuario_id = p_usuario_id
  returning * into v_parcela;

  return v_parcela;
end;
$$;

revoke all on function public.editar_vencimento_parcela_teste(uuid, uuid, text, date) from public;
grant execute on function public.editar_vencimento_parcela_teste(uuid, uuid, text, date) to anon, authenticated;

comment on function public.editar_vencimento_parcela_teste(uuid, uuid, text, date)
is 'Edita uma única parcela pendente do usuário teste, validando ID real, proprietário e credencial do login próprio.';
