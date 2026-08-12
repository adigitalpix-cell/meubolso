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

## Publicação concluída da release 0.68.1

A release `0.68.1` foi concluída no commit `3bab0ff1afaadadd0cece225f57a42b3a429c485`. O push foi realizado com sucesso, e as branches `develop` e `main` ficaram sincronizadas nesse commit. O deploy Vercel foi concluído em `https://meubolso2.vercel.app`.

A produção foi verificada servindo `/app.js?v=0.68.1`, com cache PWA `meu-bolso-v0.68.1`. O service worker opera em network-first e remove caches antigos na ativação; uma PWA já aberta pode precisar ser fechada e aberta uma vez, sem necessidade normal de limpeza manual de cache.

BUG-001 a BUG-007 integram a release homologada. Os dados dos usuários foram preservados. Banco, Auth, RLS e policies não foram alterados durante a release, e o deploy não realizou escrita no banco. A migration `auth_user_id` havia sido aplicada anteriormente em produção e não integrou a etapa de deploy. O worktree ficou limpo após a publicação.

## BUG-008 — cronograma de parcelas já pagas

Após a release, o BUG-008 foi reproduzido localmente. `saveCardPurchase()` iniciava o cronograma em `invoiceClosingDate()`, e `initialPaidInstallmentKeys()` marcava as primeiras N parcelas desse cronograma futuro. A data também herdava o dia de fechamento em vez do vencimento do cartão.

A correção recua N competências a partir de `cardInvoiceTargetMonth()`, aplica o vencimento real do cartão e usa a mesma data-base na prévia recolhível e em `purchaseInstallmentRows()`. Compras existentes não são recalculadas automaticamente.

Foram aprovados estruturalmente 6x/0, 6x/1, 6x/3, 6x/6, 12x/5, vencimento futuro e vencido, virada de ano, fevereiro bissexto e a invariante prévia=persistência. `node --check` passou, o servidor 4178 entrega o `app.js` do worktree e não houve erro crítico de console na abertura. Homologação manual permanece pendente; nenhum dado real, banco, Auth, RLS, policy ou produção foi alterado. Não houve commit, push ou deploy.

### Homologação oficial do BUG-008

O proprietário homologou manualmente o BUG-008. No cartão com vencimento no dia 21, a prévia reconstruiu as parcelas anteriores e identificou corretamente FATURA ATUAL, PRÓXIMA e PENDENTE. No Nubank, fechamento dia 1 e vencimento dia 7, o cenário 6x com 3 pagas exibiu 07/06, 07/07 e 07/08 como PAGO; 07/09 como FATURA ATUAL; 07/10 como PRÓXIMA; e 07/11 como PENDENTE.

Status oficial: **BUG-008 HOMOLOGADO PELO PROPRIETÁRIO EM 12/08/2026**. Cronograma retroativo, competência atual, vencimentos 07/21, estados e prévia discreta/recolhível foram aprovados. BUG-003, BUG-004 e BUG-007 permaneceram preservados. Esta rodada foi exclusivamente documental: código funcional, banco, schema, Auth, RLS, policies e produção não foram alterados; não houve commit, push ou deploy.

## BUG-009 — receitas recorrentes

O BUG-009 foi reproduzido estruturalmente. Receitas originais derivavam a identidade da série de campos mutáveis, não possuíam marcador persistente de encerramento e eram ignoradas pelos planos temporais usados no BUG-001. Após editar/excluir uma única ocorrência, `ensureMonthlyIncomeOccurrences()` podia usar o histórico `fixed` e recriar o mês ausente.

A correção usa a coluna textual existente `receitas.recorrencia` para persistir tipo, identidade e encerramento, sem migration. Edição e exclusão afetam somente a competência atual e futuras; passado recebido/pendente permanece inalterado. A geração passou a respeitar encerramentos, propagar identidade estável e reverter a criação local se a persistência falhar. Os cards exibem Mensal ou Não repete sem alterar o badge financeiro.

20/20 testes estruturais passaram, incluindo mensal→não repete, não repete→mensal, edição de campos, exclusão, passado preservado, refresh simulado, três gerações idempotentes, zero recriação após encerramento e rótulos dos cards. BUG-001 e BUG-008 foram preservados. Banco real, schema, Auth, RLS, policies e produção não foram alterados; não houve commit, push ou deploy. Status: **IMPLEMENTADO / TESTADO ESTRUTURALMENTE / HOMOLOGAÇÃO MANUAL PENDENTE**.

### Homologação oficial do BUG-009

O proprietário homologou manualmente o BUG-009. Foram aprovados: identificação da receita mensal, Mensal → Não repete, salvamento, refresh/reload preservando o novo estado, exclusão sem reaparecimento, regra temporal atual+futuras, histórico anterior preservado e tipo de repetição no card.

Status oficial: **BUG-009 HOMOLOGADO PELO PROPRIETÁRIO EM 12/08/2026**. BUG-001 e BUG-008 permaneceram preservados. Esta rodada foi exclusivamente documental: código funcional, banco, schema, Auth, RLS, policies e produção não foram alterados; não houve commit, push ou deploy.

## BUG-010 — rascunho automático de formulários

O BUG-010 foi reproduzido: Receita/Despesa guardavam dados apenas no diálogo e eram resetadas na reabertura; Nova Compra era destruída pela renderização da tela. Não havia draft ou estado global reutilizável.

Foi implementado um mecanismo central em `localStorage` para Nova Receita, Nova Despesa e Nova Compra, com chave por UUID financeiro, tipo e cartão quando aplicável. A lista branca preserva somente campos do cadastro, inclusive recorrência, parcelamento, parcelas já pagas e Prévia; não armazena credenciais nem chama Supabase. Fechar, navegar, atualizar e reabrir preservam. Descartar exige ação explícita e confirmação. Sucesso remoto limpa; falha preserva e reverte o estado local da tentativa de compra. Edições existentes permanecem fora do mecanismo.

20/20 testes estruturais passaram. `node --check app.js`, `node --check sw.js` e `git diff --check` foram aprovados. O bundle do worktree foi servido em `http://127.0.0.1:4178/` sem erro ou aviso de JavaScript no carregamento. BUG-001, BUG-008 e BUG-009 foram preservados. Banco, Auth, RLS, policies e produção não foram alterados; não houve commit, push ou deploy.

Status: **IMPLEMENTADO / TESTADO ESTRUTURALMENTE / HOMOLOGAÇÃO MANUAL PENDENTE**.

### Homologação oficial do BUG-010

O proprietário homologou manualmente os rascunhos de Receita, Despesa e Compra no Cartão. Foram aprovados troca de tela, refresh, restauração, campos dinâmicos, Prévia do BUG-008, descarte, limpeza após salvamento e isolamento entre usuários.

Status oficial: **BUG-010 HOMOLOGADO PELO PROPRIETÁRIO EM 12/08/2026**.

## Release 0.68.2

BUG-008, BUG-009 e BUG-010 homologados foram consolidados na release `0.68.2`. O aplicativo exibe `0.68.2`, o recurso JavaScript usa `/app.js?v=0.68.2` e o cache PWA usa `meu-bolso-v0.68.2`, preservando network-first e a remoção de caches antigos na ativação.

A release não altera banco, schema, Auth, RLS ou policies e não inclui segredo, mock, backup, dump ou migration não relacionada.

## BUG-011 — competência da fatura paga

O cenário Mercado Pago foi reproduzido com data de referência 12/08/2026. `cardInvoiceTargetMonth()` e `dueMonthKey()` já colocavam as parcelas de 07/09 na competência `2026-09`, mas `cardInvoiceGroupStatus()` recebia de `cardInvoiceDueDate()` o vencimento artificial 07/08, montado pelo mês civil corrente. A mesma divergência existia na fonte visual de notificações. A fatura paga de agosto, com pendência zero, não permanecia na coleção ativa.

A correção separou a competência programada usada pela criação/prévia da competência pendente ativa e passou a derivar fechamento, vencimento e status da mesma competência. Não houve alteração das datas corretas do Histórico de Parcelas.

Foram aprovadas 21 verificações controladas, cobrindo os 17 casos obrigatórios, BUG-008, resumo=detalhe, notificações, viradas de mês/ano, total zero e filtro por mês. O cenário equivalente ao print resultou em competência `2026-09`, vencimento 07/09/2026, status não vencido e R$ 278,80 para os três valores informados. A diferença observada de R$ 0,01 permanece indeterminada e fora do escopo.

`node --check app.js`, `node --check sw.js` e `git diff --check` passaram. O servidor 4178 entrega o `app.js` do worktree e não registrou erro crítico no carregamento. Banco, schema, Auth, RLS, policies e produção não foram alterados; não houve commit, push ou deploy.

Status: **IMPLEMENTADO / TESTADO ESTRUTURALMENTE / HOMOLOGAÇÃO MANUAL PENDENTE**.

### Residual de visibilidade de fatura futura

O valor R$ 278,79, a competência setembro e o status `Vence em 26 dias` foram parcialmente aprovados pelo proprietário, mas o card ainda expunha antecipadamente Pagar Fatura, Ver/Ocultar compras e a lista de setembro. `payablesCardGroupTemplate()` não comparava a competência: pagamento dependia apenas do total, e expansão apenas do estado global. O bloco era idêntico antes da correção principal, portanto o residual não foi introduzido pelo diff do BUG-011.

Foi adicionada uma guarda mínima de `AAAA-MM` somente para ações e detalhes. Valor e status permanecem informativos; as ações aparecem ao entrar na competência. Quatorze verificações controladas passaram, incluindo agosto→setembro, fatura paga, dezembro→janeiro e total zero. A homologação manual do BUG-011 continua pendente.

### BUG-011 residual 2 — ações por estado e alinhamento do menu

O teste manual mostrou que a guarda por competência ocultava incorretamente ações do Nubank vencido, enquanto o Neon zerado ainda podia exibir Ver compras. A remoção do botão intermediário também retirava o elemento com `margin-left:auto`, deslocando o menu ⋮.

A matriz foi refinada no mesmo componente: vencida ou atual com saldo e itens permite pagamento/expansão; futura não permite; zero ou sem itens não cria expansão vazia. O menu recebeu alinhamento próprio à direita, com preservação do agrupamento quando Ver/Ocultar existe. Quinze verificações controladas passaram, incluindo virada de ano e total/detalhe. Nesse ponto da execução, o BUG-011 aguardava a homologação manual registrada na seção seguinte.

### Homologação e release 0.68.3

O proprietário homologou o BUG-011 e seus dois residuais. Foram aprovados manualmente: Nubank vencido com saldo e ações disponíveis; Caixa futura com valor/status e sem ações antecipadas; Neon zerado sem expansão; e menu ⋮ à direita em todos os estados.

A correção homologada foi preparada para publicação na release `0.68.3`, com `/app.js?v=0.68.3`, manifesto `0.68.3` e cache `meu-bolso-v0.68.3`. A estratégia network-first inline e a remoção de caches antigos foram preservadas. Banco, Auth, RLS e policies não integram a release.
