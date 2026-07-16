begin;

alter table public.usuarios
  add column if not exists endereco text not null default '',
  add column if not exists cidade text not null default '',
  add column if not exists estado text not null default '';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'usuarios_estado_uf_check'
      and conrelid = 'public.usuarios'::regclass
  ) then
    alter table public.usuarios
      add constraint usuarios_estado_uf_check
      check (estado = '' or estado in ('AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'));
  end if;
end
$$;

commit;
