# ARQUITETURA, MODELO DE DADOS E FLUXOS CRÍTICOS

Documento consolidado para retomada segura. Descreve o estado observado no worktree de 2026-08-10; não substitui a inspeção do código nem uma consulta atual ao banco.

## Objetivo e tecnologias

MEU BOLSO é um PWA financeiro mobile first, sem etapa de build obrigatória. O frontend é HTML, CSS e JavaScript concentrado principalmente em `index.html`, `styles.css` e `app.js`. A publicação de produção ocorre pela Vercel. A persistência usa Supabase REST; a migração gradual introduziu Supabase Auth em homologação. `sw.js` e o cache do navegador oferecem operação offline parcial.

Não existe backend próprio versionado no repositório. Operações administrativas seguras que exijam Secret Key não podem ser executadas no browser.

## Ambientes e identidade

| Ambiente | Project Ref | Uso |
|---|---|---|
| Homologação | `ncgfwatsciwzzhqlspvy` | Runtime atual e único ambiente autorizado para testes de segurança quando houver aprovação |
| Produção | `hdldbvexlxsbboaxwrut` | Release `0.68.0`; não alterar sem autorização específica |

O UUID financeiro é `public.usuarios.id`. Um usuário Auth é ligado por `public.usuarios.auth_user_id`; esse vínculo não substitui o UUID financeiro.

## Módulos de negócio

| Módulo | Dados principais | Responsabilidades | Riscos conhecidos |
|---|---|---|---|
| Usuários/Perfil | `usuarios` | cadastro, perfil, acesso, validade, Master | senha legacy, ausência de RLS; BUG-002 homologado |
| Receitas | `receitas` | valores, status, recorrência, recebimento | BUG-001 e geração idempotente |
| Despesas | `despesas` | valores, status, recorrência, pagamento | BUG-001; auxiliares de parcelas duplicadas |
| Cartões | `cartoes` | limite, fechamento e vencimento | regra de competência espalhada |
| Compras/parcelas | `compras_cartao`, `parcelas` | compra, parcelamento, pagamento e fatura | residual BUG-003, BUG-007 e BUG-004 |
| Categorias/contas | `categorias`, `tipos_conta` | classificação financeira | migrations históricas divergentes |
| Suporte | `suporte` | chamados e respostas | autorização baseada no frontend |
| Renovação | `renovacoes` | validade e valores de acesso | autorização baseada no frontend |

## Modelo de dados resumido

| Tabela | Chave/vínculo principal | Campos funcionais centrais |
|---|---|---|
| `usuarios` | `id`; vínculo Auth opcional por `auth_user_id` | nome, usuário, senha legacy, contato, perfil, status, validade |
| `receitas` | `usuario_id → usuarios.id` | nome, valor, recorrência, vencimento, status e pagamento |
| `despesas` | `usuario_id → usuarios.id`; `parcela_id` quando auxiliar de cartão | nome, valor, recorrência, vencimento, status e pagamento |
| `cartoes` | `usuario_id → usuarios.id` | nome, bandeira, limite, fechamento e vencimento |
| `compras_cartao` | `usuario_id`; `cartao_id → cartoes.id` | valor total, data da compra, total de parcelas e status |
| `parcelas` | `usuario_id`; `compra_cartao_id → compras_cartao.id` | número, valor, vencimento, status e pagamento |
| `categorias` | `usuario_id` | nome, tipo e estado |
| `tipos_conta` | `usuario_id` | nome |
| `suporte` | `usuario_id` | assunto, mensagem, resposta e status |
| `renovacoes` | `usuario_id` | data, nova validade e valor |

A baseline comprovou dez tabelas públicas, quatro funções públicas, nove triggers e 25 índices. Os schemas versionados são históricos e divergem da evolução Auth: `auth_user_id` está na migration específica, não nos snapshots de schema.

## Fluxo de login e sessão

1. `bindLogin()` resolve o usuário e decide Auth ou legacy.
2. Auth: `authenticateAuthUser()` usa Supabase Auth e o vínculo `auth_user_id`.
3. Legacy: `loadLegacyUserByCredentials()` valida a senha no filtro REST, mas retorna apenas `PUBLIC_USER_FIELDS`.
4. O contexto é separado em `financialUserId`, `authUserId`, modo Auth e `viewMode`.
5. A carga passa por geração/single-flight; respostas de contexto antigo não devem substituir a atual.
6. `saveSession()` guarda IDs, modo, usuário, contexto e data; não guarda senha.
7. `logout()` encerra Auth quando aplicável, limpa sessão/cache/contexto e renderiza o login.

O REST usa timeout de 15 segundos. O login dual está habilitado no runtime de homologação. A última contagem Auth é evidência histórica e deve ser revalidada antes de qualquer escrita.

## Fluxo Master Global e Minha Conta

- `switchViewMode()` alterna entre visão Master e pessoal após revalidar o papel.
- A carga Master usa `loadMasterDatabase()` e a projeção pública de usuários.
- A carga pessoal usa `loadPersonalDatabase()` e filtra as nove coleções financeiras por `usuario_id`.
- A autorização ainda depende fortemente do frontend. Sem RLS, o banco não garante isolamento contra um cliente malicioso.
- O cadastro pelo Master e o autocadastro preservam o modelo legacy, mas separam perfil público da senha transitória. A senha não entra em `db.users`, cache ou fila nesses dois fluxos.
- No cadastro Master, a criação de `usuarios` é a etapa crítica. Categorias, tipos de conta e refresh são etapas secundárias independentes; erro/timeout pós-POST é reconciliado por username antes de rollback. Estado parcial é preservado e informado, sem exclusão remota automática.
- A projeção de campos opcionais de endereço é controlada por ambiente. Na homologação, esses três campos estão desabilitados porque as colunas não existem; os demais ambientes os preservam quando habilitados.
- A renovação Master reconcilia separadamente o PATCH de validade, o registro em `renovacoes` e o refresh; falha de reload não redefine escrita confirmada como falha.

## Recorrência e cartões

- Receitas e despesas mensais são geradas por helpers distintos. Após o BUG-001, despesas mensais usam `recurrenceId` persistido em `despesas.origem`, UUID determinístico por série/competência e edição atual+futuras. O encerramento usa `manual-recurring-ended:<recurrenceId>` em uma linha técnica oculta de valor zero: históricos anteriores permanecem intactos e o gerador reconhece a série como encerrada após refresh/reload.
- Cartões mantêm fechamento e vencimento próprios. `cardInvoiceTargetMonth()` deriva a competência atual por `invoiceClosingDate(cardId)`. `cardInvoiceItems()` representa a coleção completa; `cardPendingInvoiceItems()` deriva os pendentes usados pelo resumo; `cardPurchasesTemplate()` mostra a coleção completa e soma somente pendentes. BUG-007 usa `initialPaidInstallmentKeys()` para marcar as primeiras N parcelas informadas no cadastro. `currentInvoice()` permanece legado e fora deste fluxo homologado.
- Notificações combinam movimentos, parcelas virtuais e faturas. A APR do BUG-004 confirmou duas trilhas divergentes: o centro usa `currentInvoice()`/mês civil e o PWA trata `cardInstallmentItems().dueDate` como vencimento. O BUG-004 não foi implementado nem homologado.

## PWA, cache e offline

- `index.html` carrega `app.js` com parâmetro determinístico.
- `sw.js` usa o mesmo identificador de recurso e o cache `meu-bolso-v0.68.0-bug006-login-alert`, com rede primeiro e cache como fallback offline.
- Na instalação, os assets são pré-armazenados; na ativação, caches de nome antigo são removidos.
- O fetch usa rede com gravação de resposta no cache e fallback para cache quando necessário.
- O banco em cache passa por `sanitizeCredentialFields()`; `normalizeDatabase()` não recria senha.
- A fila offline remove campos de credencial e bloqueia operações de credencial. Trocas/criações que lidam com senha exigem conexão.

## Segurança atual

- RLS: desativada; policies públicas: zero na baseline.
- Cinco usuários ainda eram legacy na última evidência histórica.
- Senha legacy ainda é necessária transitoriamente em login, criação e edição.
- `saveNewUserToSupabase(publicUser, legacyPassword)` envia a coluna `senha` somente no payload online transitório. A edição Master usa `updateLegacyPassword()` sem materializar `password` no objeto local.
- A validação final EC-18 encontrou categoria H, materialização indevida em objeto runtime, igual a zero.
- Os schemas históricos possuem uma credencial bootstrap Master fixa. Não reproduzir o valor; tratar como risco crítico.
- Não há autorização para corrigir esses pontos nesta auditoria.

## Glossário

- **APR**: análise preliminar de risco; não é implementação.
- **EC**: execução controlada, com escopo e autorização próprios.
- **Legacy**: autenticação pela tabela pública `usuarios` durante a transição.
- **Auth**: autenticação gerenciada por Supabase Auth.
- **UUID financeiro**: `public.usuarios.id`, usado pelas tabelas de negócio.
- **Homologação técnica**: validação em ambiente de teste; não equivale à aprovação do proprietário.
- **E2E real**: teste pelo fluxo completo com ambiente real autorizado; simulação isolada não é E2E.
- **Baseline**: fotografia validada de schema, contagens e integridade em uma data.

## Objetivo de segurança

Migrar gradualmente para Auth e depois RLS sem apagar senhas legacy antes da hora, sem mudar UUIDs financeiros, sem perder histórico e sem bloquear autocadastro ou cadastro Master. APR, implementação mínima, teste e aprovação separados formam o fluxo padrão recomendado; o proprietário pode ajustar esse processo mediante autorização expressa, preservando os controles técnicos necessários.
