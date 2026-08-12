# Compatibilidade de schema — `usuarios.auth_user_id` em produção

Data da APR: 12/08/2026.

## Estado comprovado por leitura

| Propriedade | Homologação (`ncgfwatsciwzzhqlspvy`) | Produção (`hdldbvexlxsbboaxwrut`) |
|---|---|---|
| Coluna existe | Sim | Sim |
| Tipo | `uuid` | `uuid` |
| Nullable | Sim | Sim |
| Default | Nenhum | Nenhum |
| UNIQUE | Índice único parcial | Não |
| FK | `auth.users(id)`, `ON DELETE RESTRICT`, validada | Não |
| Índice | `usuarios_auth_user_id_uidx`, somente não nulos | Não |
| Trigger relacionado | Nenhum | Nenhum |
| RLS em `usuarios` | Desativada | Desativada |
| Policies públicas | 0 | 0 |
| Usuários financeiros | 8 | 6 |
| Vínculos Auth | 1 | 0 |
| Usuários Auth | 1 | 0 |

Na homologação, 1 usuário financeiro está vinculado e 7 permanecem Legacy com `auth_user_id IS NULL`. A FK e o índice único parcial existem formalmente, mas não são necessários para a compatibilidade funcional imediata de produção.

## Decisão da APR

A migration mínima adicionou somente `public.usuarios.auth_user_id uuid NULL`, sem default. Não replicou a FK nem o índice único parcial da homologação. A diferença é deliberada: produção não possui usuários Auth e todos os seis registros existentes permanecem Legacy.

Arquivo aplicado em produção em 12/08/2026: `supabase/migration-add-auth-user-id-production-compat-v0.68.0.sql`.

O SQL é idempotente pelo uso de `ADD COLUMN IF NOT EXISTS`. Ele não contém `UPDATE`, não preenche valores e não referencia tabelas financeiras.

## Compatibilidade funcional

- Login Legacy: preservado pelo filtro `auth_user_id IS NULL`.
- Restauração por UUID financeiro: `loadUserById()` continua usando `public.usuarios.id`.
- Master: a projeção pública passa a receber `auth_user_id = null` para usuários Legacy.
- Troca de senha Legacy: permanece restrita a `id` e `auth_user_id IS NULL`.
- Cadastro Legacy: continua criando o registro com `auth_user_id = NULL`.
- Auth: adicionar a coluna não cria conta em `auth.users`, não cria vínculo e não muda sessão ou senha.

## Checklist usado na aplicação

1. Confirmar backup recente e ponto de restauração.
2. Registrar schema anterior, contagem de usuários e conjunto de `usuarios.id`.
3. Confirmar destino `hdldbvexlxsbboaxwrut` e ausência anterior da coluna.
4. Executar somente a migration aprovada.
5. Confirmar coluna `uuid`, nullable, sem default e seis valores NULL.
6. Confirmar contagens e UUIDs financeiros inalterados.
7. Confirmar Auth, RLS e policies inalterados.
8. Só depois preparar e testar o bundle com configuração de produção.

## Rollback documentado

Rollback conceitual, não executado:

```sql
alter table public.usuarios
  drop column if exists auth_user_id;
```

Ele é seguro apenas enquanto nenhum usuário de produção tiver `auth_user_id` preenchido e antes de um bundle dependente da coluna permanecer ativo. Se o bundle já tiver sido publicado, primeiro é necessário restaurar a versão anterior do aplicativo; depois de qualquer vínculo Auth real, a remoção exige nova análise.

## Configuração e arquivos de release

O worktree atual aponta para homologação em `supabase-config.js`; esse arquivo não pode entrar cegamente em produção. A futura release deve preparar uma configuração de produção, preservar chaves administrativas fora do navegador/Git e validar `projectRef`, URL, flags e chave pública do ambiente.

Devem ser excluídos da publicação ou de aplicação automática: segredos, variáveis locais, backups/dumps/ZIPs, mocks, instrumentação temporária, a configuração atual de homologação e migrations não relacionadas. `migration-auth-foundation-v0.68.0.sql` comprova a fundação completa da homologação, mas não deve ser aplicada em produção nesta etapa mínima.

## Estado

Migration aplicada em produção e validada por catálogo em 12/08/2026: coluna `uuid`, nullable, sem default; 6 usuários Legacy com valor NULL, 0 vínculos e 0 usuários Auth. UUIDs financeiros, RLS e policies foram preservados.

A auditoria completa posterior está em `COMPATIBILIDADE_PUBLIC_USER_FIELDS_PRODUCAO.md`. Ela confirmou que `endereco`, `cidade` e `estado` não existem em nenhum dos dois ambientes e são desativados por flag na homologação. A release aguarda preparação explícita da configuração de produção, não uma nova migration de schema.
