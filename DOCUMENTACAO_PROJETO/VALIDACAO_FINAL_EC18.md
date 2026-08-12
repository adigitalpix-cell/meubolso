# VALIDAÇÃO FINAL DO BLOCO EC-18

Data da validação técnica: 2026-08-10.

## Objetivo

Determinar se os fluxos normais do frontend mantêm `db.users`, cache, fila e sessão livres de `password`/`senha`, preservando apenas credenciais transitórias indispensáveis ao login Auth/legacy, criação legacy e alteração de senha legacy.

## Resultado

O objetivo técnico do bloco EC-18 foi alcançado: não foi encontrado caminho normal que materialize `password` ou `senha` em `db.users`.

EC-18.10.3 removeu a última escrita runtime conhecida da edição Master, preservando o PATCH específico executado por `updateLegacyPassword()`.

## Classificação das ocorrências restantes

| Categoria | Ocorrências funcionais | Estado |
|---|---|---|
| A — sanitização/defesa | `sanitizeCredentialFields()`, `containsCredentialField()`, `clearPasswordFields()` | Necessárias |
| B — login/validação legacy | `loadLegacyUserByCredentials()`, `validateLegacyPassword()`, captura em `bindLogin()` | Transitórias e necessárias durante a migração |
| C — criação legacy | `saveNewUserToSupabase()`, variáveis locais de `registerUser()` e criação Master | Transitórias, online-only |
| D — alteração legacy | `updateLegacyPassword()`, variáveis locais de `saveUser()` e `changePassword()` | Transitórias, online-only |
| E — Supabase Auth | `authenticateAuthUser()`/`signInWithPassword()` | Transitória no SDK |
| F — formulário/DOM | inputs `type=password`, mensagens e limpeza dos formulários | Necessárias; campos limpos |
| G — histórico/schema | credencial bootstrap nos schemas históricos | Risco separado; não é runtime ativo |
| H — materialização em objeto runtime | nenhuma | **ZERO** |
| I — outro | nenhuma materialização adicional encontrada | ZERO |

## Caminhos de `db.users`

| Caminho | Proteção/evidência | Credencial materializada |
|---|---|---|
| Seed e inicialização | seed sem campos de credencial | Não |
| `normalizeDatabase()` | não cria/recria credencial | Não |
| Cache/restauração | cache sanitizado antes da normalização | Não |
| `loadDatabase()` | usuários carregados com `PUBLIC_USER_FIELDS` | Não |
| `loadMasterDatabase()` | `PUBLIC_USER_FIELDS` + sanitização | Não |
| `loadPersonalDatabase()` | perfil público sanitizado antes e depois da normalização | Não |
| Loaders por ID/username/Auth | `PUBLIC_USER_FIELDS` | Não |
| Login legacy | senha somente no filtro; retorno público sanitizado | Não |
| Login Auth | perfil resolvido por `auth_user_id` e campos públicos | Não |
| Autocadastro | `newUser` público; senha em variável separada | Não |
| Criação Master | `newUser` público; senha em variável separada | Não |
| Edição Master | EC-18.10.3 removeu a atribuição runtime | Não |
| Master ↔ Minha Conta | cargas públicas, sanitização e geração/contexto | Não |

## Loaders e conversores

- `loadUserById()` usa `PUBLIC_USER_FIELDS`.
- `loadLegacyUserByCredentials()` usa senha somente no filtro e retorna `PUBLIC_USER_FIELDS`.
- `loadMasterDatabase()` usa `PUBLIC_USER_FIELDS`.
- `loadPersonalDatabase()` injeta apenas perfil público sanitizado.
- `fromSupabaseRows()` não lê `row.senha` nem cria `password`.
- `toSupabaseRows()` não cria coleção `usuarios` nem coluna `senha`.
- `userToSupabaseLike()` não existe.
- Não existe chamada de `select=*` para a tabela `usuarios`.

## Cache, fila, sessão e DOM

- Cache: `sanitizeDatabaseForCache()` remove recursivamente `password`/`senha`.
- Cache antigo: `sanitizeStoredDatabaseCache()` regrava a cópia sanitizada.
- Fila: operações contendo credenciais são removidas; operação de credencial em `usuarios` é rejeitada.
- Criação e PATCH de senha: `queueOffline: false` e exigência de conexão.
- Sessão da aplicação: IDs, modo, username, viewMode e data; sem senha.
- `localStorage`: o aplicativo não grava senha legacy. O SDK Supabase pode persistir sua sessão Auth sob chave própria; isso não contém a senha digitada.
- DOM: `clearPasswordFields()` reseta formulários, valores, defaults e atributos quando acionado nos fluxos previstos. Enquanto o usuário digita ou após alguns erros de edição que mantêm o formulário aberto, o valor pode permanecer no próprio input até nova ação; isso é categoria F e não materializa a senha em `db.users`, cache, fila ou sessão.

## Fluxos transitórios permitidos

Senha permanece somente pelo tempo necessário em variáveis/formulários de:

- login legacy;
- validação de senha legacy;
- troca de senha legacy;
- criação de usuário legacy;
- login `signInWithPassword()` do Supabase Auth.

Esses fluxos não inserem credencial em `db.users`, cache, fila ou sessão.

## Riscos residuais

- Senhas legacy continuam armazenadas em texto no banco enquanto a migração Auth não termina.
- RLS e policies continuam ausentes.
- Cinco usuários permaneciam legacy na última evidência histórica.
- Schemas históricos contêm uma credencial bootstrap fixa; o valor não é reproduzido e não foi alterado.
- A criação Master remota continua multi-etapas e não transacional, relacionada ao BUG-002.
- Não houve E2E real autenticado nesta validação; os testes foram sintáticos, estruturais e isolados.

## Parecer

- `db.users` com `password` em fluxo normal: NÃO.
- `db.users` com `senha` em fluxo normal: NÃO.
- Loaders retornam senha: NÃO.
- Conversores geram senha: NÃO.
- Normalizador recria senha: NÃO.
- Seed contém senha: NÃO.
- Cache/fila/sessão guardam senha: NÃO.
- Hardcode de senha no runtime ativo: NÃO.
- Categoria H: ZERO.
- EC-18 tecnicamente concluída no objetivo de remover credenciais do runtime: SIM.

Essa conclusão não equivale a E2E, homologação do proprietário, conclusão da migração Auth ou autorização para produção.

## Próximo bloco funcional recomendado

1. BUG-002 — cadastro Master inconsistente e persistência multi-etapas.
2. BUG-001 — recorrência duplicada.
3. BUG-003 — divergência entre resumo e detalhe de cartões.
4. BUG-004 — notificações de cartão; depende da regra de fatura consolidada do BUG-003.

O proprietário pode alterar essa ordem conforme DEC-019.
