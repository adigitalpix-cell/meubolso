-- MEU BOLSO 0.57.3
-- Corrige a estrutura de categorias sem remover registros existentes.
-- A aplicação atual usa autenticação própria na tabela usuarios, e não Supabase Auth.
-- Por isso esta migração não cria políticas RLS abertas nem políticas baseadas em auth.uid().

alter table public.categorias
  add column if not exists tipo text not null default 'both';

alter table public.categorias
  add column if not exists ativo boolean not null default true;

do $$
begin
  if not exists (
    select 1
      from pg_constraint
     where conname = 'categorias_tipo_check'
       and conrelid = 'public.categorias'::regclass
  ) then
    alter table public.categorias
      add constraint categorias_tipo_check
      check (tipo in ('income', 'expense', 'both'));
  end if;
end $$;

-- Primeiro cria a proteção nova. Se houver duplicidades históricas, a migração
-- interrompe aqui sem apagar dados e mantém a restrição antiga intacta.
create unique index if not exists categorias_usuario_nome_tipo_ci_uidx
  on public.categorias (usuario_id, lower(btrim(nome)), tipo);

alter table public.categorias
  drop constraint if exists categorias_usuario_id_nome_key;

create index if not exists idx_categorias_usuario
  on public.categorias (usuario_id);
