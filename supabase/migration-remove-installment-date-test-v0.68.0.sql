-- MEU BOLSO 0.68.0
-- Remove oficialmente a ferramenta temporária de edição do vencimento de parcelas.
-- Migration idempotente: não altera tabelas nem dados.

begin;

do $$
begin
  if to_regprocedure('public.editar_vencimento_parcela_teste(uuid,uuid,text,date)') is not null then
    revoke execute on function public.editar_vencimento_parcela_teste(uuid, uuid, text, date) from anon;
    revoke execute on function public.editar_vencimento_parcela_teste(uuid, uuid, text, date) from authenticated;
  end if;
end;
$$;

drop function if exists public.editar_vencimento_parcela_teste(uuid, uuid, text, date);

-- O trigger e sua função foram criados exclusivamente para obrigar o uso da RPC temporária.
drop trigger if exists parcelas_proteger_edicao_vencimento on public.parcelas;
drop function if exists public.proteger_edicao_direta_vencimento_parcela();

commit;
