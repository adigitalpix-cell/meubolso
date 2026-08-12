# RELATÓRIO OFICIAL DO DIA — MEU BOLSO

Data: 2026-08-11  
Branch: `develop`  
HEAD base: `b82e6abbe96ca8220a0fbac39c41969807acc83f`

## BUG-001 — residual legacy

O proprietário confirmou que uma recorrência nova funcionava em criação, edição, refresh e exclusão, mas a recorrência antiga “aluguel” reaparecia após ser excluída. O BUG-001 permaneceu não homologado.

A falha foi reproduzida com dados fictícios: janeiro e fevereiro pagos continuavam `fixed`; a exclusão removia somente março; o carregamento seguinte usava os históricos para derivar novamente o token legacy e recriar março.

## Regra temporal oficial

“Editar ou excluir uma recorrência mensal afeta somente a competência atual e as futuras. Competências anteriores permanecem preservadas no histórico.”

## Correção estrutural

- séries ativas: `manual-recurring:<recurrenceId>`;
- séries encerradas: `manual-recurring-ended:<recurrenceId>`;
- atual e futuras viram marcadores técnicos ocultos de valor zero;
- passado e pagamentos permanecem intactos;
- refresh, reload, cache e geração reconhecem o encerramento;
- nenhuma migration, banco real ou produção foram alterados.

## Validação

Vinte cenários fictícios passaram, incluindo série nova/legacy, histórico pago/não pago, quatro tipos de edição, transições de recorrência, geração repetida, refresh, reconstrução, offline, falha, retry, séries semelhantes e a invariante de uma ocorrência por série/competência.

Bundle: `/app.js?v=0.68.0-bug001-legacy`  
Cache: `meu-bolso-v0.68.0-bug001-legacy`

## Homologação manual do BUG-001

O proprietário confirmou no servidor oficial 4178:

- criação de recorrência: OK;
- edição mensal → fixa/não recorrente: OK;
- exclusão: OK;
- histórico anterior preservado;
- recorrência excluída não reapareceu após atualização.

BUG-001: HOMOLOGADO PELO PROPRIETÁRIO.

## Estado após BUG-001, antes do BUG-003

- BUG-001: HOMOLOGADO PELO PROPRIETÁRIO.
- BUG-002 e BUG-005: homologados e preservados.
- BUG-006 e EC-18: preservados.
- BUG-003 e BUG-004: ainda não iniciados naquele checkpoint.
- Commit, push e deploy: não realizados.

Próxima ação então registrada: diagnosticar e corrigir o BUG-003 — divergência entre resumo e detalhe de cartões — mantendo BUG-004 pendente.

## BUG-003 — cartões: resumo x detalhe

O defeito foi reproduzido de forma controlada. Após o dia de fechamento, `payablesCardGroups()` continuava representando parcelas pendentes do mês corrente, enquanto `cardPurchasesTemplate()` avançava para o mês do próximo fechamento. Assim, resumo e detalhe podiam exibir conjuntos e totais diferentes.

A correção mínima criou `cardInvoiceItems()`, coleção compartilhada por resumo e detalhe. Não houve recálculo de histórico, alteração de banco, Auth, RLS/policies ou produção. Os fluxos de notificação e `currentInvoice()` foram preservados para não iniciar o BUG-004.

Vinte de vinte cenários estruturais passaram, incluindo limites antes/no/depois do fechamento, vencimento, 6 parcelas, primeira/intermediária/última, igualdade de total, refresh, reload, mudança de mês, múltiplos cartões, fatura paga/aberta, cache/offline e timezone.

Bundle: `/app.js?v=0.68.0-bug003-cards`  
Cache: `meu-bolso-v0.68.0-bug003-cards`

Estado atualizado:

- BUG-001: HOMOLOGADO PELO PROPRIETÁRIO;
- BUG-002 e BUG-005: homologados e preservados;
- BUG-003: IMPLEMENTADO / TESTADO ESTRUTURALMENTE / NÃO HOMOLOGADO;
- BUG-004: PENDENTE e não alterado funcionalmente;
- commit, push e deploy: não realizados.

Próxima ação então registrada: teste manual do proprietário no servidor oficial 4178, comparando o total do resumo com a soma dos itens no detalhe da mesma fatura.

## Fechamento documental após teste manual do BUG-003

Estado oficial no encerramento de 11/08/2026:

- EC-18: tecnicamente concluída no objetivo de zero credenciais em runtime;
- BUG-001: HOMOLOGADO;
- BUG-002: HOMOLOGADO;
- BUG-005: HOMOLOGADO;
- BUG-006: IMPLEMENTADO / TESTADO ESTRUTURALMENTE / HOMOLOGAÇÃO MANUAL FINAL PENDENTE;
- BUG-003: IMPLEMENTADO / TESTADO ESTRUTURALMENTE / TESTADO MANUALMENTE COM RESÍDUO / NÃO HOMOLOGADO;
- BUG-007: IDENTIFICADO PELO PROPRIETÁRIO / PENDENTE DE APR / NÃO IMPLEMENTADO;
- BUG-004: PENDENTE e não iniciado nesta rodada.

No teste manual do BUG-003, compras existentes, resumo e detalhe pendentes ficaram coerentes. Porém, uma nova compra do Nubank foi salva, apareceu em Transações e teve pagamento registrado, mas não apareceu em `Compras - Nubank`. A próxima investigação deve separar: itens completos da fatura; itens pendentes; e total pendente. Item pago deve continuar visível como `PAGO`, mas não pode compor o total pendente.

O BUG-007 registra que compras parceladas com pagamento inicial precisam informar quantas parcelas já foram pagas. A UX preferencial a avaliar é a pergunta `Quantas parcelas já foram pagas?`; nenhuma decisão foi implementada.

Servidor local oficial preservado: `http://127.0.0.1:4178/`, servindo `C:\Projetos\meubolso`. DEC-019 e DEC-020 permanecem vigentes.

Crédito informado pelo proprietário no encerramento: **80**.

Próxima ação exata: retomar pelo diagnóstico do residual do BUG-003, verificando a separação entre itens completos da fatura e itens que compõem o total pendente.

## Implementação do residual BUG-003 — itens pagos no detalhe

O residual foi reproduzido com as funções reais do `app.js`. `cardInstallmentItems()` materializava corretamente compras e parcelas pagas, porém `cardInvoiceItems()` as eliminava pela condição que combinava status pago e competência no mesmo filtro.

A correção mínima separou as responsabilidades:

- `cardInvoiceItems()` agora fornece todos os itens da competência, pagos e pendentes;
- `cardPendingInvoiceItems()` deriva somente os itens pendentes;
- `payablesCardGroups()` usa a coleção pendente;
- `cardPurchasesTemplate()` usa a coleção completa e calcula o total somente sobre itens pendentes;
- o card já existente mantém selo `PAGO` e oculta a ação de pagamento para item pago.

Foram aprovados 20/20 testes residuais, cobrindo compras simples, parceladas, pagas, pendentes, mistas, limites de fechamento, troca de mês, dois cartões, cartão vazio, refresh, reload, total pendente e ausência de duplicidade. `node --check app.js`, `node --check sw.js` e `git diff --check` também passaram.

Bundle: `/app.js?v=0.68.0-bug003-paid-items`  
Cache: `meu-bolso-v0.68.0-bug003-paid-items`

Banco, Auth, RLS, policies, migrations, produção, histórico financeiro, BUG-004, BUG-006 e BUG-007 não foram alterados. O servidor oficial 4178 serviu os arquivos atuais sem erro JavaScript no carregamento; a validação autenticada final permanece manual.

Status atualizado: BUG-003 RESIDUAL IMPLEMENTADO / TESTADO ESTRUTURALMENTE / HOMOLOGAÇÃO MANUAL PENDENTE.

Próxima ação exata: testar manualmente no servidor oficial 4178 um cartão com item pago e item pendente na mesma competência, confirmando que ambos aparecem e somente o pendente compõe o total.

## Diagnóstico real e correção conjunta BUG-003 + BUG-007

Foram localizadas por leitura na homologação três compras `cartao nu teste 11.8` do Nubank: uma 4x paga, uma 2x paga e uma 2x pendente. As oito parcelas e seus vínculos foram confirmados sem alterar dados.

O BUG-003 não era apenas filtro de pago. Todas as primeiras parcelas estavam em setembro, porém `cardInvoiceItems()` usava agosto como alvo padrão. Esse era o primeiro descarte. `cardInvoiceTargetMonth()` passou a derivar a competência por fechamento do cartão, e `payablesCardGroups()` aplica a regra individualmente por cartão. `currentInvoice()` continua legado, mas não participa de Compras do Cartão nem do agrupamento de Meus Cartões.

O BUG-007 foi reproduzido em `saveCardPurchase()`: status Pago atribuía `allInstallmentKeys()` e marcava todas as parcelas. O modal agora mostra `Parcelas já pagas` para compra parcelada paga, valida 0 até o total e usa `initialPaidInstallmentKeys()` para gerar status individual.

Passaram 13 testes conjuntos: 4x com 0/1/2/4 pagas, simples paga/pendente, competência setembro do Nubank, pagas e pendente visíveis, total pendente, histórico, ausência de duplicidade e provas estáticas do fluxo. Sintaxe, service worker e diff também foram validados.

Bundle: `/app.js?v=0.68.0-bug003-bug007-real`  
Cache: `meu-bolso-v0.68.0-bug003-bug007-real`

As três compras reais, o banco, Auth, RLS, policies, migrations, produção e BUG-004 permaneceram intactos.

Status: BUG-003 e BUG-007 IMPLEMENTADOS / TESTADOS ESTRUTURALMENTE / HOMOLOGAÇÃO MANUAL PENDENTE.

Próxima ação exata: cadastrar manualmente uma nova compra parcelada e comparar Transações, Compras do Cartão e Histórico de Parcelas.

## UX — filtro discreto em Compras do Cartão

Foi adicionada somente uma camada visual sobre `cardInvoiceItems()`, sem modificar as regras funcionais de BUG-003 e BUG-007.

- Pendentes é o padrão e classifica a compra pela existência de qualquer parcela ainda não paga.
- Pagos mostra somente compras totalmente quitadas.
- Filtrar por mês consulta a competência explícita pela coleção já estabilizada.
- Atual retorna à fatura atual e a Pendentes.
- O topo permanece matematicamente pendente e agora usa o rótulo `Total pendente`.
- O filtro não é persistido e volta ao padrão na troca de cartão, saída/retorno e refresh.

Passaram 18/18 testes estruturais. Sintaxe, service worker, diff, bundle servido e ausência de erro JavaScript também foram confirmados.

Bundle: `/app.js?v=0.68.0-card-purchase-filter`  
Cache: `meu-bolso-v0.68.0-card-purchase-filter`

BUG-003 e BUG-007 foram preservados e não foram marcados como homologados nesta execução. Banco, Auth, RLS, policies, produção e BUG-004 permaneceram intactos.

Próxima ação exata: teste visual do proprietário na tela Compras do Cartão.

## Homologação pelo proprietário — UX filtro Compras do Cartão

O proprietário homologou manualmente no servidor oficial 4178 as visualizações Pendentes, Pagos e Filtrar por mês.

Também foram aprovados: compra parcialmente paga mantida em Pendentes; parcela da competência já paga visível como `PAGO` dentro de compra ainda pendente; compra totalmente quitada em Pagos; total exclusivamente pendente; e visual discreto do controle.

Regra oficial registrada: a classificação Pendentes considera a compra inteira. Uma parcela paga pode aparecer nessa visualização quando outra parcela da mesma compra continuar não paga. Pagos exige quitação total. O filtro mensal apresenta os itens da competência escolhida.

Status: UX FILTRO COMPRAS DO CARTÃO HOMOLOGADA PELO PROPRIETÁRIO.

Esta homologação não altera o estado formal de BUG-003 ou BUG-007. BUG-004 não foi iniciado. Código, banco, Auth, RLS, policies e produção não foram alterados.

Próxima ação: aguardar nova autorização expressa do proprietário.

## Homologação formal BUG-003 e BUG-007 + correção residual BUG-006

O proprietário declarou BUG-003 e BUG-007 aprovados e autorizou seu registro formal como HOMOLOGADOS.

No BUG-006, o teste manual atual foi reprovado porque a mensagem de bloqueio não chegava ao formulário. O rastreamento confirmou, por leitura na homologação, um único usuário bloqueado no fluxo Legacy. `usuarios.status = "bloqueado"`, `fromSupabaseRows()`, `isAccessBlocked()` e `accessRestrictionMessage()` estavam corretos. A primeira etapa incorreta era a inserção no DOM: `bindLogin()` consultava `event.currentTarget` depois de `await`, quando o valor já era `null`.

A correção mínima reteve o formulário antes da primeira operação assíncrona. Passaram 10/10 cenários: Legacy ativo, bloqueado correto, bloqueado incorreto, vencido, inexistente, Auth ativo, Auth bloqueado, ausência de sessão financeira no bloqueio Auth, erro de rede e limpeza após bloqueio Auth.

Bundle: `/app.js?v=0.68.0-bug006-login-alert`  
Cache: `meu-bolso-v0.68.0-bug006-login-alert`

Banco, dados, Auth, RLS, policies, produção, BUG-004 e demais regras funcionais permaneceram intactos. BUG-006 está CORRIGIDO E TESTADO TECNICAMENTE, mas NÃO HOMOLOGADO; aguarda novo teste manual do proprietário no servidor oficial 4178.

## Homologação BUG-006 + APR curta BUG-004

O proprietário homologou o BUG-006 no servidor oficial 4178. O login do usuário administrativamente bloqueado foi impedido, nenhuma sessão foi criada e o DOM exibiu a mensagem oficial de bloqueio.

O BUG-004 recebeu somente precheck e diagnóstico. Foram mapeadas duas trilhas: o centro usa `currentInvoice()` com mês civil e vencimento montado no mês atual; a notificação PWA usa `cardInstallmentItems().dueDate`, derivada da referência de fechamento gravada na compra, como se fosse vencimento. Isso pode gerar competência errada, aviso antes do fechamento, fechamento tratado como vencimento e duplicidade entre fatura e parcelas.

Status: BUG-004 APR/PRECHECK CONCLUÍDO / NÃO IMPLEMENTADO / NÃO HOMOLOGADO. Foi preparada matriz futura de 16 cenários para cartão com fechamento dia 1 e vencimento dia 7. Decisão pendente: entrega nativa única nas mudanças de estado ou repetição diária enquanto pendente.

Código funcional, banco, Auth, RLS, policies e produção não foram alterados. BUG-003 e BUG-007 permaneceram homologados.

## Implementação cirúrgica BUG-004

Centro e PWA passaram a consumir a mesma derivação de fatura pendente por cartão e competência. `currentInvoice()` foi preservado para callers legados, mas deixou de alimentar notificações. Fechamento e vencimento são calculados separadamente; pago não gera pendência.

O push é criado somente na data exata do fechamento e do vencimento. As chaves usam `cardId + competência + closing|due`, ficam em log permanente específico de cartão e são reservadas antes da entrega sob Web Lock quando disponível. O log diário de receitas/despesas foi preservado separadamente.

O centro mostra Fatura fechada, Fatura vence hoje e Fatura vencida. O clique carrega a competência exata em `payCardInvoice()`. Itens individuais de parcela deixaram de criar uma segunda notificação paralela de cartão.

Resultados: 18/18 cenários obrigatórios e 4/4 regressões de deduplicação aprovados; sintaxe, service worker, diff e runtime 4178 sem erro crítico. Bundle/cache: `0.68.0-bug004-card-notifications`.

Status: BUG-004 IMPLEMENTADO / TESTADO ESTRUTURALMENTE / HOMOLOGAÇÃO MANUAL PENDENTE. Banco, Auth, RLS, policies, produção, BUG-003 e BUG-007 permaneceram intactos.

## Correção residual BUG-004 — total e duplicidade no centro

O proprietário encontrou duas notificações Nubank vencidas de R$ 262,50, enquanto as telas financeiras exibiam R$ 377,45. O rastreamento na homologação comprovou que o centro enumerava julho e agosto como estados históricos simultâneos; cada competência somava Relógio R$ 62,50 e TV R$ 200,00.

O centro interno foi separado do push e passou a consumir somente a competência atual de `cardInvoiceTargetMonth()` e a coleção pendente de `cardPendingInvoiceItems()`. Assim, o total é idêntico ao BUG-003 e existe somente um estado principal por cartão/competência. A fonte e a deduplicação do push/PWA não foram alteradas.

Passaram 11/11 testes focados, incluindo Nubank vencido R$ 377,45 único, Caixa R$ 62,50, quitação, repetição, refresh/reload, cartões homônimos, duas competências e transição de estado. Bundle/cache: `0.68.0-bug004-residual-card-notifications`.

Status: BUG-004 RESIDUAL IMPLEMENTADO / TESTADO ESTRUTURALMENTE / NOVA HOMOLOGAÇÃO MANUAL PENDENTE. Produção, banco, Auth, RLS, policies, BUG-003, BUG-006 e BUG-007 permaneceram intactos.
