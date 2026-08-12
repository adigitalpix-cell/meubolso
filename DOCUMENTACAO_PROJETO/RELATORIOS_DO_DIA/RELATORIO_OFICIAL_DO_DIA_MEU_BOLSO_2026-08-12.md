# RELATÓRIO OFICIAL DO DIA — MEU BOLSO — 12/08/2026

## Homologação oficial do BUG-004

O proprietário homologou manualmente o **BUG-004 — Notificações de cartão** no servidor local oficial `http://127.0.0.1:4178/`.

Base validada:

- ZIP de referência: `11.22.48.zip`;
- bundle: `0.68.0-bug004-residual-card-notifications`.

Evidências aprovadas:

- Nubank em Meus Cartões: fatura atual R$ 262,50, vencida há 5 dias;
- Nubank em Notificações: um único item `Fatura vencida`, R$ 262,50;
- valor das notificações igual ao total atual de Meus Cartões;
- duplicidade e estado histórico obsoleto eliminados;
- Caixa em Meus Cartões: R$ 62,50, vencendo em 5 dias;
- Caixa em Notificações: `Fatura fechada`, R$ 62,50, vencimento em 17/08/2026;
- BUG-003, BUG-006 e BUG-007 preservados.

Status oficial: **BUG-004 HOMOLOGADO PELO PROPRIETÁRIO EM 12/08/2026**.

Esta rodada foi exclusivamente documental. Código funcional, banco, Auth, RLS, policies e produção não foram alterados. Não houve migration, commit, push ou deploy.

Próxima ação: enviar esta homologação ao ChatGPT para revisão do estado geral dos bugs e definição da próxima frente do projeto.

## APR cirúrgica — compatibilidade de schema para release

Uma consulta somente leitura confirmou que homologação possui `public.usuarios.auth_user_id uuid`, nullable e sem default, enquanto produção não possui a coluna. Homologação tem 8 usuários financeiros, sendo 1 vinculado ao Auth e 7 Legacy; produção tem 6 usuários financeiros e 0 usuários Auth.

Foi preparada, sem execução, a migration idempotente `supabase/migration-add-auth-user-id-production-compat-v0.68.0.sql`, que adiciona somente a coluna nullable. FK, índice único, trigger, RLS e policies não integram esta etapa mínima. O rollback e o checklist de aplicação futura foram documentados em `COMPATIBILIDADE_SCHEMA_AUTH_USER_ID_PRODUCAO.md`.

Produção, Auth, dados, RLS e policies não foram alterados. Não houve commit, push ou deploy. A release permanece bloqueada até autorização da aplicação controlada e posterior preparação da configuração de produção.

## Auditoria completa de `PUBLIC_USER_FIELDS`

A migration mínima de `auth_user_id` foi posteriormente aplicada e validada em produção: tipo `uuid`, nullable, sem default, 6 usuários Legacy, 0 vínculos Auth e UUIDs financeiros preservados.

Os 14 campos potenciais do código foram comparados por catálogo entre homologação e produção. Os ambientes são iguais. `endereco`, `cidade` e `estado` não existem em nenhum deles; portanto, não há tipo homologado nem migration consolidada legítima a preparar. A projeção efetiva de 11 campos, usada quando `userProfileAddressFieldsEnabled` é `false`, retornou os 6 usuários de produção, e o filtro Legacy retornou 6 sem `42703`.

Nenhuma migration foi criada ou aplicada nesta auditoria. O próximo passo é preparar a configuração de produção explicitando a flag como `false`. Não houve alteração de frontend, commit, push ou deploy.

## Configuração de produção e pre-release local

`supabase-config.js` foi preparado localmente para `hdldbvexlxsbboaxwrut`, usando somente configuração pública de frontend. Login dual foi desativado, pois produção possui seis usuários Legacy e nenhum vínculo Auth. Os campos opcionais de endereço foram explicitamente desativados.

O servidor oficial 4178 foi iniciado e comprovou servir os arquivos do worktree. `node --check app.js` e `node --check sw.js` passaram. A tela de login abriu e uma consulta controlada por usuário inexistente retornou a resposta funcional esperada, sem `42703`.

Não havia credencial autorizada para login real; Master e módulos financeiros não foram abertos. Banco, Auth, RLS, policies e dados não foram alterados. Não houve commit, push ou deploy. A release aguarda revisão final do proprietário.

## Preparação da release 0.68.1

Após aprovação manual do smoke test completo pelo proprietário, a versão final foi definida como `0.68.1`, com `/app.js?v=0.68.1` e cache `meu-bolso-v0.68.1`. O bump é exclusivamente determinístico para garantir atualização do PWA; não altera lógica funcional.

O escopo autorizado inclui staging controlado do runtime homologado, vendor, migrations aprovadas/aplicadas, baseline e documentação oficial, seguido de um único commit de release e promoção `develop → main` sem force push.
