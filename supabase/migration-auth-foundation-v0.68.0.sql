-- MEU BOLSO 0.68.0
-- Fase 2 / Execucao Controlada 04
-- Fundacao minima de Supabase Auth.
-- Destino autorizado: homologacao ncgfwatsciwzzhqlspvy.
-- Producao hdldbvexlxsbboaxwrut: proibido executar.
--
-- Esta migration e estritamente aditiva:
-- - preserva public.usuarios.id e todos os vinculos financeiros;
-- - preserva a senha e o login legados;
-- - nao cria usuarios em auth.users;
-- - nao preenche auth_user_id;
-- - nao habilita RLS e nao cria policies.

begin;

alter table public.usuarios
  add column if not exists auth_user_id uuid;

create unique index if not exists usuarios_auth_user_id_uidx
  on public.usuarios (auth_user_id)
  where auth_user_id is not null;

do $$
begin
  if not exists (
    select 1
      from pg_constraint
     where conname = 'usuarios_auth_user_id_fkey'
       and conrelid = 'public.usuarios'::regclass
  ) then
    alter table public.usuarios
      add constraint usuarios_auth_user_id_fkey
      foreign key (auth_user_id)
      references auth.users(id)
      on delete restrict
      not valid;
  end if;
end
$$;

alter table public.usuarios
  validate constraint usuarios_auth_user_id_fkey;

commit;
