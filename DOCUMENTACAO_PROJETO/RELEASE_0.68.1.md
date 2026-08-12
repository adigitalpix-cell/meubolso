# Release 0.68.1

Data: 12/08/2026.

## Escopo

Publicação consolidada das correções e melhorias homologadas do BUG-001 ao BUG-007, fundação gradual de segurança, UX aprovada e compatibilidade do schema de produção.

## Runtime

- produção: `hdldbvexlxsbboaxwrut`;
- `authDualLoginEnabled: false`;
- `userProfileAddressFieldsEnabled: false`;
- recurso: `/app.js?v=0.68.1`;
- cache: `meu-bolso-v0.68.1`;
- service worker: network-first com fallback offline.

## Banco

`public.usuarios.auth_user_id uuid NULL` foi aplicado previamente em produção. Os seis usuários permanecem Legacy, sem vínculo Auth. A release não aplica migration, não altera dados, Auth, RLS ou policies.

## Homologação

O proprietário aprovou manualmente Login, Home, Transações, Despesas a Pagar, Meus Cartões, Notificações e Master/Usuários contra produção pelo servidor oficial 4178.

## Git e deploy

- commit final: `3bab0ff1afaadadd0cece225f57a42b3a429c485`;
- push: concluído;
- branches: `develop` e `main` sincronizadas no commit final;
- deploy Vercel: concluído;
- produção: `https://meubolso2.vercel.app`;
- worktree após a release: limpo.

## Atualização PWA

A produção serve `/app.js?v=0.68.1` e usa `meu-bolso-v0.68.1`. O service worker aplica network-first e remove caches antigos durante a ativação. Usuários com a PWA já aberta podem precisar fechá-la e abri-la uma vez; não deve ser necessária limpeza manual do cache.

## Integridade

BUG-001 a BUG-007 foram incluídos na release homologada. Dados dos usuários foram preservados. O deploy não escreveu no banco nem alterou Auth, RLS ou policies. A migration `auth_user_id` foi aplicada anteriormente e não pertenceu ao deploy desta release.
