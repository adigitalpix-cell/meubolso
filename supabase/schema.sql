create extension if not exists "pgcrypto";

create table if not exists public.usuarios (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  usuario text not null unique,
  senha text not null,
  whatsapp text not null unique,
  email text not null unique,
  data_cadastro date not null default current_date,
  data_vencimento date not null default (current_date + interval '30 days'),
  status text not null default 'ativo' check (status in ('ativo', 'vencendo', 'vencido', 'bloqueado')),
  perfil text not null default 'usuario' check (perfil in ('master', 'usuario')),
  valor_renovacao numeric(12,2) not null default 49.90,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.receitas (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  nome text not null,
  valor numeric(12,2) not null check (valor >= 0),
  recorrencia text not null default 'none',
  data_vencimento date not null,
  status text not null default 'a_receber' check (status in ('recebido', 'a_receber')),
  categoria text not null,
  tipo_conta text not null,
  forma_pagamento text,
  data_pagamento date,
  hora_pagamento time,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.despesas (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  nome text not null,
  valor numeric(12,2) not null check (valor >= 0),
  recorrencia text not null default 'none',
  data_vencimento date not null,
  status text not null default 'nao_pago' check (status in ('pago', 'nao_pago')),
  categoria text not null,
  tipo_conta text not null,
  forma_pagamento text,
  data_pagamento date,
  hora_pagamento time,
  origem text not null default 'manual',
  compra_cartao_id uuid,
  parcela_id uuid,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.cartoes (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  nome text not null,
  bandeira text not null,
  limite numeric(12,2) not null check (limite >= 0),
  fechamento smallint not null check (fechamento between 1 and 31),
  vencimento smallint not null check (vencimento between 1 and 31),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (usuario_id, nome)
);

create table if not exists public.compras_cartao (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  cartao_id uuid not null references public.cartoes(id) on delete cascade,
  nome text not null,
  valor_total numeric(12,2) not null check (valor_total >= 0),
  parcelas_total smallint not null default 1 check (parcelas_total between 1 and 12),
  categoria text not null,
  data_compra date not null,
  status text not null default 'pendente' check (status in ('pendente', 'pago', 'fechado')),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.parcelas (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  compra_cartao_id uuid not null references public.compras_cartao(id) on delete cascade,
  numero smallint not null check (numero >= 1),
  valor numeric(12,2) not null check (valor >= 0),
  data_vencimento date not null,
  status text not null default 'pendente' check (status in ('pago', 'pendente', 'atrasado')),
  data_pagamento date,
  hora_pagamento time,
  forma_pagamento text,
  tipo_conta text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (compra_cartao_id, numero)
);

create table if not exists public.suporte (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  nome text not null,
  usuario text not null,
  whatsapp text not null,
  email text not null,
  assunto text not null,
  mensagem text not null,
  resposta_master text,
  status text not null default 'pendente' check (status in ('pendente', 'em_atendimento', 'resolvido')),
  data_hora timestamptz not null default now(),
  respondido_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.renovacoes (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  data_renovacao date not null default current_date,
  validade_anterior date,
  nova_validade date not null,
  meses smallint,
  valor numeric(12,2) not null default 0,
  criado_em timestamptz not null default now()
);

create table if not exists public.categorias (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  nome text not null,
  tipo text not null default 'ambas' constraint categorias_tipo_check check (tipo in ('receita', 'despesa', 'ambas')),
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

alter table public.categorias add column if not exists tipo text not null default 'ambas';
alter table public.categorias add column if not exists ativo boolean not null default true;
alter table public.categorias add column if not exists atualizado_em timestamptz not null default now();
alter table public.categorias drop constraint if exists categorias_tipo_check;
update public.categorias set tipo = case tipo when 'income' then 'receita' when 'expense' then 'despesa' when 'both' then 'ambas' else tipo end;
alter table public.categorias alter column tipo set default 'ambas';
alter table public.categorias add constraint categorias_tipo_check check (tipo in ('receita', 'despesa', 'ambas'));
create unique index if not exists categorias_usuario_nome_tipo_ci_uidx
  on public.categorias (usuario_id, lower(btrim(nome)), tipo);
alter table public.categorias drop constraint if exists categorias_usuario_id_nome_key;

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

create table if not exists public.tipos_conta (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  nome text not null,
  criado_em timestamptz not null default now(),
  unique (usuario_id, nome)
);

create index if not exists idx_receitas_usuario on public.receitas(usuario_id);
create index if not exists idx_despesas_usuario on public.despesas(usuario_id);
create index if not exists idx_cartoes_usuario on public.cartoes(usuario_id);
create index if not exists idx_compras_usuario on public.compras_cartao(usuario_id);
create index if not exists idx_parcelas_usuario on public.parcelas(usuario_id);
create index if not exists idx_suporte_usuario on public.suporte(usuario_id);
create index if not exists idx_renovacoes_usuario on public.renovacoes(usuario_id);

create or replace function public.atualizar_atualizado_em()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

drop trigger if exists usuarios_atualizado_em on public.usuarios;
create trigger usuarios_atualizado_em before update on public.usuarios
for each row execute function public.atualizar_atualizado_em();

drop trigger if exists receitas_atualizado_em on public.receitas;
create trigger receitas_atualizado_em before update on public.receitas
for each row execute function public.atualizar_atualizado_em();

drop trigger if exists despesas_atualizado_em on public.despesas;
create trigger despesas_atualizado_em before update on public.despesas
for each row execute function public.atualizar_atualizado_em();

drop trigger if exists cartoes_atualizado_em on public.cartoes;
create trigger cartoes_atualizado_em before update on public.cartoes
for each row execute function public.atualizar_atualizado_em();

drop trigger if exists compras_cartao_atualizado_em on public.compras_cartao;
create trigger compras_cartao_atualizado_em before update on public.compras_cartao
for each row execute function public.atualizar_atualizado_em();

drop trigger if exists parcelas_atualizado_em on public.parcelas;
create trigger parcelas_atualizado_em before update on public.parcelas
for each row execute function public.atualizar_atualizado_em();

drop trigger if exists suporte_atualizado_em on public.suporte;
create trigger suporte_atualizado_em before update on public.suporte
for each row execute function public.atualizar_atualizado_em();

drop trigger if exists categorias_atualizado_em on public.categorias;
create trigger categorias_atualizado_em before update on public.categorias
for each row execute function public.atualizar_atualizado_em();

insert into public.usuarios (nome, usuario, senha, whatsapp, email, data_cadastro, data_vencimento, status, perfil)
values ('Alex', 'alex', 'sepi25al22Mu', '00000000000', 'alex.cf10@outlook.com', current_date, current_date + interval '365 days', 'ativo', 'master')
on conflict (usuario) do update set
  senha = excluded.senha,
  perfil = 'master',
  status = 'ativo';
