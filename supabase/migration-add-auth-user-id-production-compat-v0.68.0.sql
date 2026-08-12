-- MEU BOLSO 0.68.0
-- Compatibilidade minima do schema de producao com o bundle homologado.
-- Destino autorizado: producao hdldbvexlxsbboaxwrut.
-- Aplicada de forma controlada e validada em 12/08/2026.
--
-- Efeitos esperados:
-- - adiciona somente uma coluna uuid nullable, sem default;
-- - preserva public.usuarios.id, senha, status, perfil e dados financeiros;
-- - usuarios existentes permanecem Legacy com auth_user_id NULL;
-- - nao cria usuario Auth, vinculo, indice, FK, trigger, RLS ou policy.

begin;

alter table public.usuarios
  add column if not exists auth_user_id uuid;

commit;
