# ARQUIVOS CRÍTICOS

## Servidor local oficial

- Origem única: `http://127.0.0.1:4178/`.
- Raiz obrigatória: `C:\Projetos\meubolso`.
- Antes de liberar um link, comparar `app.js`, `styles.css`, `index.html` e `sw.js` servidos com o worktree.
- `file://` não é válido porque altera origem, service worker, cache, sessão e comportamento de rede.
- Query strings não determinam versão; o versionamento real vem de `index.html` e `sw.js`.

## `app.js`

- Finalidade: aplicação inteira, UI, autenticação, sessão, loaders, conversores, persistência, regras financeiras e eventos.
- Áreas críticas:
  - configuração Auth e `PUBLIC_USER_FIELDS` no início;
  - `seed` e `normalizeDatabase()`;
  - cache/fila offline;
  - `loadDatabase()`, `loadMasterDatabase()`, `loadPersonalDatabase()`;
  - loaders Auth/legacy;
  - `persistDatabase()`, `fromSupabaseRows()`, `toSupabaseRows()`;
  - cadastro público, cadastro Master e troca de senha;
  - cartões: `cardInstallmentItems()`, `cardInvoiceTargetMonth()`, `cardInvoiceItems()`, `cardPendingInvoiceItems()`, `payablesCardGroups()`, `cardPurchasesTemplate()`, `initialPaidInstallmentKeys()` e `saveCardPurchase()`;
  - `initializeApp()`.
- Riscos: arquivo monolítico; mudança pode afetar várias telas; cadastro remoto continua multi-etapas, embora o BUG-002 agora diferencie a criação crítica das falhas secundárias; RLS permanece ausente. Materialização de credenciais runtime foi encerrada tecnicamente na EC-18.10.3.
- ECs/alterações recentes: EC-10, 12–15, 17, 18.1–18.10.3, BUG-002, BUG-003 e BUG-007.

## `index.html`

- Finalidade: shell da aplicação, dialogs e carregamento de recursos.
- Área crítica: versão determinística de `/app.js?v=...` e ordem de `vendor`, configuração e aplicação.
- Risco: divergência com `sw.js` pode manter JavaScript antigo.
- Estado atual: `/app.js?v=0.68.0-bug006-login-alert`.
- EC recente: EC-17 e versionamentos EC-18.x.

## `styles.css`

- Finalidade: identidade MB C2 e layouts mobile first.
- Áreas críticas: componentes compartilhados, modais/bottom sheets, menus contextuais e navegação fixa.
- Risco: seletores globais podem atingir telas não relacionadas.
- ECs recentes: melhorias visuais anteriores ao release e ajustes acumulados de segurança/UI.

## `sw.js`

- Finalidade: cache offline do PWA.
- Áreas críticas: `CACHE_NAME`, lista `ASSETS`, estratégia de atualização e remoção de cache anterior.
- Risco: versão diferente de `index.html` entrega bundle antigo.
- Estado: cache `meu-bolso-v0.68.0-bug006-login-alert`, estratégia network-first com fallback offline.
- ECs recentes: EC-17 e versionamentos EC-18.x.

## `supabase-config.js`

- Finalidade: configuração runtime local/implantada.
- Estado atual: aponta para homologação e habilita dual login.
- Compatibilidade atual: `userProfileAddressFieldsEnabled: false`, pois a homologação não possui `endereco`, `cidade` e `estado`.
- Risco: contém chave pública de runtime e nunca deve ser copiado para documentação ou logs; uma configuração errada pode apontar para produção.
- Não alterar sem confirmar Project Ref e ambiente.

## `config.example.js`

- Finalidade: modelo sem credenciais para configuração Supabase.
- Risco: deve permanecer apenas com placeholders.
- EC recente: preparação do dual login.

## `schema.sql`

- Finalidade: schema histórico básico na raiz.
- Conteúdo: dez tabelas públicas, índices por usuário, função de timestamp e triggers.
- Riscos: pode divergir da produção e das migrations; não inclui `auth_user_id`; contém credencial bootstrap Master fixa. Não executar como migration incremental nem reproduzir o valor da credencial.

## `supabase/schema.sql`

- Finalidade: schema histórico mais completo para Supabase.
- Diferenças relevantes: inclui evolução de categorias, função `categoria_em_uso` e trigger de categorias.
- Riscos: não é prova de objetos aplicados; não inclui `auth_user_id`; contém credencial bootstrap Master fixa. Produção real é definida pela baseline/dump e histórico validado.

## `supabase/migration-auth-foundation-v0.68.0.sql`

- Finalidade: adicionar `auth_user_id`, índice único parcial e FK para `auth.users`.
- Estado: aplicada somente em homologação; arquivo ainda não rastreado pelo Git.
- Risco: não aplicar novamente ou em produção sem autorização expressa e validação técnica; APR é o fluxo recomendado.

## `supabase/migration-remove-installment-date-test-v0.68.0.sql`

- Finalidade: remover RPC/trigger/função temporários de edição de vencimento.
- Estado: implementação EC-18.3; arquivo ainda não rastreado.
- Risco: migrations documentam intenção; aplicação no banco precisa de evidência separada. O `supabase/README.md` foi corrigido para registrar a remoção.

## Outras migrations

- `migration-categories-v0.57*.sql`: evolução de categorias.
- `migration-installment-date-test-v0.65.0.sql`: criação histórica da ferramenta temporária.
- `migration-security-profile.sql`: evolução histórica da tela/perfil.
- `test-data-installments-v0.65.0.sql`: dados de teste específicos; nunca executar em produção sem autorização.

## `BASELINE_PRODUCAO_MEU_BOLSO.md`

- Finalidade: referência oficial da produção em 2026-08-08.
- Inclui hashes de backup, contagens agregadas, estrutura e integridade.
- Não contém segredos.
- Estado: arquivo local ainda não rastreado pelo Git.

## `vendor/`

- Finalidade: biblioteca Supabase JS local para o browser.
- Estado: diretório não rastreado.
- Risco: precisa acompanhar `index.html` no pacote/ZIP para o login Auth funcionar sem CDN.
