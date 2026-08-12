# Compatibilidade completa de `PUBLIC_USER_FIELDS`

APR somente leitura concluída em 12/08/2026.

## Lista derivada do código atual

O código declara 14 campos potenciais:

`id,nome,usuario,whatsapp,email,endereco,cidade,estado,data_cadastro,data_vencimento,status,perfil,valor_renovacao,auth_user_id`

Os campos `endereco`, `cidade` e `estado` são condicionais. Com `userProfileAddressFieldsEnabled: false`, como no worktree homologado, a projeção efetiva contém 11 campos:

`id,nome,usuario,whatsapp,email,data_cadastro,data_vencimento,status,perfil,valor_renovacao,auth_user_id`

## Catálogo: homologação × produção

| Campo | H existe | P existe | Tipo H | Tipo P | Nullable H | Nullable P | Default H | Default P |
|---|---:|---:|---|---|---|---|---|---|
| `id` | Sim | Sim | `uuid` | `uuid` | Não | Não | `gen_random_uuid()` | `gen_random_uuid()` |
| `nome` | Sim | Sim | `text` | `text` | Não | Não | nenhum | nenhum |
| `usuario` | Sim | Sim | `text` | `text` | Não | Não | nenhum | nenhum |
| `whatsapp` | Sim | Sim | `text` | `text` | Não | Não | nenhum | nenhum |
| `email` | Sim | Sim | `text` | `text` | Não | Não | nenhum | nenhum |
| `endereco` | Não | Não | — | — | — | — | — | — |
| `cidade` | Não | Não | — | — | — | — | — | — |
| `estado` | Não | Não | — | — | — | — | — | — |
| `data_cadastro` | Sim | Sim | `date` | `date` | Não | Não | `CURRENT_DATE` | `CURRENT_DATE` |
| `data_vencimento` | Sim | Sim | `date` | `date` | Não | Não | `(CURRENT_DATE + '30 days'::interval)` | igual |
| `status` | Sim | Sim | `text` | `text` | Não | Não | `'ativo'::text` | igual |
| `perfil` | Sim | Sim | `text` | `text` | Não | Não | `'usuario'::text` | igual |
| `valor_renovacao` | Sim | Sim | `numeric` | `numeric` | Não | Não | `49.90` | `49.90` |
| `auth_user_id` | Sim | Sim | `uuid` | `uuid` | Sim | Sim | nenhum | nenhum |

Não existe incompatibilidade de catálogo entre os dois ambientes para os 14 nomes auditados.

## Validação pós-migration de produção

- usuários financeiros: 6;
- `auth_user_id IS NULL`: 6;
- `auth_user_id IS NOT NULL`: 0;
- usuários Auth: 0;
- RLS de `usuarios`: desativada;
- policies públicas: 0;
- conjunto dos seis UUIDs financeiros: idêntico ao precheck anterior.

A migration de `auth_user_id` foi aplicada corretamente em produção.

## Campos de perfil

`endereco`, `cidade` e `estado` não existem no catálogo de homologação nem no de produção. Portanto, não há tipo real homologado a replicar e nenhuma migration consolidada pode ser preparada com base no estado real dos ambientes.

Como as colunas não existem, não há constraint, índice ou trigger associado a elas. Os snapshots históricos e `migration-security-profile.sql` descrevem `text NOT NULL DEFAULT ''` e uma constraint de UF, mas esses arquivos não comprovam aplicação e não substituem o catálogo real.

## Causa do erro `42703` residual

A consulta de validação anterior incluiu manualmente os três campos opcionais e falhou em `endereco`. Isso não representava a projeção efetiva do runtime homologado, porque `supabase-config.js` define `userProfileAddressFieldsEnabled: false`.

A projeção efetiva de 11 campos foi consultada em produção e retornou os 6 usuários. O filtro `auth_user_id IS NULL` também retornou 6, sem erro `42703`.

## Decisão

Não criar migration consolidada: não há diferença de schema a corrigir e os tipos pedidos não existem no catálogo de homologação.

A futura configuração de produção deve definir explicitamente `userProfileAddressFieldsEnabled: false`. A configuração registrada no HEAD não possui essa propriedade; como o código usa `!== false`, a ausência ativa indevidamente os campos. Essa alteração pertence à etapa posterior de preparação da configuração e não foi feita nesta APR.

## Teste previsto para a release

Após preparar a configuração de produção, consultar exatamente:

`id,nome,usuario,whatsapp,email,data_cadastro,data_vencimento,status,perfil,valor_renovacao,auth_user_id`

e validar separadamente `auth_user_id=is.null`. O critério é 6 resultados Legacy e nenhum `42703`.

## Estado

`PUBLIC_USER_FIELDS` auditado completamente. Migration consolidada não preparada por ausência de incompatibilidade real. Produção não foi alterada nesta APR.

## Configuração e teste pré-release

Em 12/08/2026, `supabase-config.js` foi preparado localmente para produção com:

- Project Ref e URL de `hdldbvexlxsbboaxwrut`;
- configuração pública/publishable do frontend;
- `authDualLoginEnabled: false`;
- `userProfileAddressFieldsEnabled: false`.

O servidor oficial `http://127.0.0.1:4178/` foi iniciado servindo o worktree. `index.html`, `app.js`, `styles.css`, `sw.js`, `supabase-config.js` e o vendor retornaram HTTP 200 e o mesmo tamanho em bytes dos arquivos locais.

A tela de login carregou. Uma busca controlada por identificador inexistente retornou “Usuário ou senha incorretos”, comprovando que `loadUserByUsername()` executou a projeção efetiva contra produção sem `42703`. Nenhuma credencial real foi usada e nenhum login foi concluído.

Login real, telas financeiras e Master não foram testados por ausência de credencial autorizada. Nenhum dado ou banco foi alterado. Release ainda não publicada.
