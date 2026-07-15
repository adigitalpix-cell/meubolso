-- MEU BOLSO 0.57.4
-- Migração não destrutiva para o CRUD completo da tabela public.categorias.
-- Identificador do proprietário: usuario_id -> public.usuarios(id).

alter table public.categorias
  add column if not exists tipo text not null default 'ambas';

alter table public.categorias
  add column if not exists ativo boolean not null default true;

alter table public.categorias
  add column if not exists atualizado_em timestamptz not null default now();

alter table public.categorias
  drop constraint if exists categorias_tipo_check;

update public.categorias
   set tipo = case tipo
     when 'income' then 'receita'
     when 'expense' then 'despesa'
     when 'both' then 'ambas'
     else tipo
   end;

alter table public.categorias
  alter column tipo set default 'ambas';

alter table public.categorias
  add constraint categorias_tipo_check
  check (tipo in ('receita', 'despesa', 'ambas'));

-- Se existirem duplicidades históricas equivalentes, o índice interrompe a
-- migração sem apagar registros para que elas possam ser revisadas manualmente.
create unique index if not exists categorias_usuario_nome_tipo_ci_uidx
  on public.categorias (usuario_id, lower(btrim(nome)), tipo);

alter table public.categorias
  drop constraint if exists categorias_usuario_id_nome_key;

create index if not exists idx_categorias_usuario
  on public.categorias (usuario_id);

-- A estrutura financeira histórica armazena o nome da categoria. Esta função
-- recebe o ID real, valida o proprietário e resolve o vínculo sem alterar as
-- tabelas de receitas, despesas ou compras de cartão.
create or replace function public.categoria_em_uso(p_categoria_id uuid, p_usuario_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.categorias c
     where c.id = p_categoria_id
       and c.usuario_id = p_usuario_id
       and (
         exists (select 1 from public.receitas r where r.usuario_id = p_usuario_id and lower(btrim(r.categoria)) = lower(btrim(c.nome)))
         or exists (select 1 from public.despesas d where d.usuario_id = p_usuario_id and lower(btrim(d.categoria)) = lower(btrim(c.nome)))
         or exists (select 1 from public.compras_cartao cc where cc.usuario_id = p_usuario_id and lower(btrim(cc.categoria)) = lower(btrim(c.nome)))
       )
  );
$$;

revoke all on function public.categoria_em_uso(uuid, uuid) from public;
grant execute on function public.categoria_em_uso(uuid, uuid) to anon, authenticated;

create or replace function public.atualizar_atualizado_em()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

drop trigger if exists categorias_atualizado_em on public.categorias;
create trigger categorias_atualizado_em
before update on public.categorias
for each row execute function public.atualizar_atualizado_em();

-- Materializa no Supabase as categorias iniciais que antes também existiam no
-- JavaScript. A comparação ignora caixa e não cria duplicatas por usuário.
insert into public.categorias (usuario_id, nome, tipo, ativo)
select u.id, defaults.nome, defaults.tipo, true
  from public.usuarios u
 cross join (values
   ('Alimentação', 'despesa'),
   ('Moradia', 'despesa'),
   ('Transporte', 'despesa'),
   ('Saúde', 'despesa'),
   ('Educação', 'despesa'),
   ('Lazer', 'despesa'),
   ('Salário', 'receita'),
   ('Outros', 'ambas')
 ) as defaults(nome, tipo)
 where not exists (
   select 1
     from public.categorias existing
    where existing.usuario_id = u.id
      and lower(btrim(existing.nome)) = lower(btrim(defaults.nome))
 );

-- Segurança: não são criadas políticas abertas. O aplicativo usa login próprio
-- na tabela usuarios e não emite JWT do Supabase Auth; portanto auth.uid() não
-- identifica o usuário atual e uma política baseada nele bloquearia o app.
