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

Esta documentação integra o próprio commit único da release. O hash final, os pushes de `develop` e `main` e o resultado do deploy Vercel são registrados no relatório operacional entregue ao proprietário após a publicação.
