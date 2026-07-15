-- MEU BOLSO 0.57
-- Migração não destrutiva para categorias por tipo e desativação.
-- Categorias já existentes continuam ativas e compatíveis com receitas e despesas.

alter table public.categorias
  add column if not exists tipo text not null default 'both';

alter table public.categorias
  add column if not exists ativo boolean not null default true;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'categorias_tipo_check'
      and conrelid = 'public.categorias'::regclass
  ) then
    alter table public.categorias
      add constraint categorias_tipo_check
      check (tipo in ('income', 'expense', 'both'));
  end if;
end $$;
