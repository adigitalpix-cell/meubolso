# BUG-004 — NOTIFICAÇÕES DE CARTÃO

## Status

**IMPLEMENTADO / TESTADO ESTRUTURALMENTE / HOMOLOGAÇÃO MANUAL PENDENTE.**

Data: 2026-08-11. Análise somente de código. Banco, Auth, RLS, policies, dados e produção não foram acessados nem alterados.

## Regra oficial preservada

- Compra feita até o fechamento pertence à fatura atual; depois do fechamento, à próxima.
- Do fechamento até o vencimento, uma fatura pendente deve informar que fechou e precisa ser paga.
- Depois do vencimento, deve informar que está vencida.
- Parcela/fatura paga não deve permanecer como pendência.
- A data individual da compra ou parcela não deve ser a regra principal do vencimento da fatura.
- A competência homologada por BUG-003 e o status individual homologado por BUG-007 devem ser preservados.

## Fluxo atual mapeado

### Centro de notificações

```text
cartoes.closingDay / cartoes.dueDay + compras_cartao
→ notificationCenterSources()
→ currentInvoice(card.id), baseado em monthKey() civil
→ vencimento montado com dueDay no mês civil atual
→ item invoice: pendente / vence hoje / vencida
→ notificationCenterItems()
→ sino e tela Notificações
→ openNotificationTarget() → payCardInvoice()
```

### Notificação do sistema/PWA

```text
compras_cartao.purchaseDate / installmentDueDates
→ installmentDueDate()
→ cardInstallmentItems().dueDate
→ dueNotificationCandidates(), somente dueDate <= hoje
→ agrupamento por nome do cartão + data + estado
→ checkDueNotifications()
→ showAppNotification()
→ service worker / Notification API
```

O agendamento parte de `render()` → `scheduleDueNotificationCheck()` e usa `DUE_NOTIFICATION_LOG_KEY` no `localStorage` para evitar nova entrega da mesma chave no mesmo dia.

## PRECHECK

### Funções envolvidas

- Competência/parcelas: `invoiceClosingDate()`, `installmentInfo()`, `currentInvoice()`, `installmentDueDate()`, `cardInstallmentItems()`.
- Regra homologada: `cardInvoiceTargetMonth()`, `cardInvoiceItems()`, `cardPendingInvoiceItems()`.
- Centro: `notificationCenterSources()`, `notificationCenterItems()`, `notificationsTemplate()`, `notificationCenterRow()`, `openNotificationTarget()`.
- PWA: `scheduleDueNotificationCheck()`, `dueNotificationLogKey()`, `sentDueNotificationKeys()`, `dueNotificationCandidates()`, `checkDueNotifications()`, `showAppNotification()`.
- Datas auxiliares: `dateOffset()`, `localDateKey()`, `monthKey()`, `daysInMonth()`.

### Divergências comprovadas no código

1. `currentInvoice()` usa `installmentInfo(purchase, monthKey())`; não usa `cardInvoiceTargetMonth(card.id)`. Portanto, pode calcular agosto enquanto a fatura homologada por fechamento já está em setembro.
2. O centro cria o vencimento com `dueDay` no mês civil atual, sem verificar se a fatura já fechou. Pode classificar como pendente ou vencida uma competência diferente.
3. `saveCardPurchase()` usa `invoiceClosingDate(cardId)` como `purchaseDate`. `installmentDueDate()` deriva dessa referência e `cardInstallmentItems()` a expõe como `dueDate`.
4. `dueNotificationCandidates()` trata essa `dueDate` como vencimento e pode anunciar no fechamento que a fatura “vence hoje” ou “está vencida”.
5. O centro pode gerar simultaneamente um item de fatura e itens de parcelas para o mesmo cartão. A notificação PWA agrupa por nome, não por ID do cartão.

Conclusão: `currentInvoice()` é suspeito principal no bloco de fatura do centro, mas não é a única causa. A trilha PWA possui uma segunda causa independente ao tratar a referência de fechamento da parcela como vencimento.

## Riscos

| Risco | Evidência atual |
|---|---|
| Fatura/competência errada | `currentInvoice()` usa mês civil; BUG-003 usa competência por fechamento |
| Aviso antes do fechamento | bloco invoice não condiciona criação ao fechamento |
| Fechamento tratado como vencimento | PWA usa `cardInstallmentItems().dueDate` |
| Parcela paga notificada | mitigado pelos filtros `!isPaidStatus()`; deve permanecer em regressão |
| Duplicidade visual | centro combina um item invoice e vários installment para a mesma fatura |
| Repetição PWA | chave de enviados é diária; uma pendência pode ser reenviada em dias sucessivos |
| Cartões homônimos agrupados | PWA agrupa por `cardName`, não `card.id` |
| Timezone/data-limite | comparações principais usam datas locais ao meio-dia, reduzindo risco; limites de fechamento/vencimento ainda exigem testes |
| Regressão BUG-003 | qualquer correção que ignore `cardInvoiceTargetMonth()` pode reintroduzir divergência resumo × detalhe |
| Regressão BUG-007 | qualquer coleção que ignore status individual pode recolocar parcela paga como pendente |

## Matriz de teste futura

Cartão padrão: fechamento dia 1, vencimento dia 7.

| # | Data/estado | Resultado a validar |
|---:|---|---|
| 1 | Antes do fechamento | fatura futura não notificada como fechada/vencida |
| 2 | No fechamento | fatura pendente passa ao estado fechado |
| 3 | Depois do fechamento | permanece fechada e pendente até o vencimento |
| 4 | Sete dias antes do vencimento | respeita fechamento; não cria aviso antecipado indevido |
| 5 | Três dias antes | mensagem de fatura fechada e pendente |
| 6 | Um dia antes | mensagem de fatura fechada e pendente |
| 7 | No vencimento | estado/texto conforme decisão de produto registrada |
| 8 | Um dia depois | fatura vencida |
| 9 | Paga antes do vencimento | nenhuma notificação pendente |
| 10 | Paga no vencimento | some imediatamente após confirmação |
| 11 | Paga depois | aviso vencido removido após confirmação |
| 12 | Múltiplas parcelas | somente competência e parcelas pendentes corretas |
| 13 | Duas faturas | atual e futura não se misturam |
| 14 | Dois cartões | competência, vencimento e identificação independentes |
| 15 | Competência setembro com data atual agosto | mesma fatura de BUG-003 no centro e no PWA |
| 16 | Virada de dia/timezone | sem avanço/atraso de um dia nos limites |

Também devem ser validados: ausência de duplicidade entre invoice/installment, não repetição indevida da notificação nativa, pagamento pela notificação e preservação dos totais homologados.

## Decisão de produto aplicada

O proprietário aprovou uma única entrega no fechamento e uma única entrega no vencimento. Não existe repetição diária após o vencimento. O centro interno continua representando visualmente a pendência enquanto houver saldo.

## Implementação

- `cardInvoiceCycleDates()` separa fechamento e vencimento por cartão e competência, incluindo vencimento no mês seguinte quando `dueDay < closingDay`.
- `cardInvoiceNotificationStates()` deriva somente itens pendentes usando `cardInvoiceTargetMonth()` e `cardPendingInvoiceItems(cardId, competence)`.
- `cardInvoiceNotificationSources()` alimenta o centro com estados Fatura fechada, Vence hoje e Fatura vencida.
- Itens individuais de parcela foram removidos como fonte paralela do centro; a fatura é a fonte principal.
- `cardInvoicePushCandidates()` gera eventos somente na data exata de fechamento ou vencimento.
- Chaves estáveis usam `cardId + competência + evento`: `card:<id>:<AAAA-MM>:closing|due`.
- O log permanente de eventos de cartão é separado do log diário de receitas/despesas, evitando efeito colateral em outros avisos.
- `checkDueNotifications()` grava a chave antes da entrega, desfaz a reserva se a entrega falhar e usa Web Lock quando disponível para serializar duas abas.
- O clique no item interno envia a competência para `payCardInvoice()`, garantindo pagamento da mesma fatura exibida.
- `currentInvoice()` não foi alterado; somente deixou de ser fonte do BUG-004.

## Testes executados

Passaram **18/18 cenários obrigatórios** com stubs e dados fictícios: antes/no/depois do fechamento, repetição no fechamento, véspera, vencimento e repetição, atraso sem push diário, pagamento antes/entre/no vencimento, mistura paga+pendente, duas competências, cartões homônimos por IDs distintos, duas abas, reload e limite de mês/timezone.

Passaram mais **4/4 verificações focadas** após separar os logs: fechamento único, persistência entre dias, comportamento diário não-cartão preservado e reload sem duplicidade.

Também passaram `node --check app.js`, `node --check sw.js` e `git diff --check`. O servidor oficial 4178 carregou `/app.js?v=0.68.0-bug004-card-notifications` sem erro crítico no navegador.

## Regressão preservada

BUG-003 continua fornecendo competência e coleção pendente. BUG-007 continua definindo status individual. Nenhuma função homologada desses bugs foi modificada. Total pendente exclui itens pagos.

Não alterar `cardInvoiceTargetMonth()`, `cardInvoiceItems()`, `cardPendingInvoiceItems()`, `paidInstallments` ou `initialPaidInstallmentKeys()`; essas regras já estão homologadas.

## Próxima ação

Homologação manual concluída em 12/08/2026. Encaminhar o resultado ao ChatGPT para revisão do estado geral dos bugs e definição da próxima frente, sem iniciar automaticamente outro bug.

## Correção residual — valor atual e duplicidade no centro

O teste manual encontrou duas notificações vencidas do Nubank, ambas em R$ 262,50, enquanto Meus Cartões e Despesas a Pagar exibiam R$ 377,45.

O rastreamento somente leitura na homologação comprovou que julho e agosto continham as mesmas parcelas pendentes: Relógio, R$ 62,50, e TV, R$ 200,00. `cardInvoiceNotificationStates()` enumerava todas as competências históricas ainda pendentes; `cardInvoiceNotificationSources()` transformava julho e agosto em dois itens vencidos distintos. Compras presentes somente na competência alvo ficavam fora desses dois totais históricos.

A correção residual preservou a fonte do push/PWA e separou o centro interno:

- `cardCurrentInvoiceCycleDates()` deriva o estado atual exibido pelas telas do cartão;
- `cardCurrentInvoiceNotificationStates()` seleciona exatamente `cardInvoiceTargetMonth(card.id)` e soma `cardPendingInvoiceItems(card.id, competence)`;
- `cardInvoiceNotificationSources()` passou a consumir somente essa coleção atual;
- existe no máximo um item ativo por cartão e competência no centro;
- estados históricos/obsoletos não coexistem com o estado principal atual;
- `cardInvoicePushCandidates()` continua usando `cardInvoiceNotificationStates()` e não foi funcionalmente alterado.

Passaram 11/11 testes focados: fechada, vencida, paga, três chamadas, refresh, reload, cartões homônimos, duas competências, transição fechada para vencida, Caixa R$ 62,50 e preservação da fonte do push. O cenário Nubank equivalente produz um único item `Fatura vencida` no total de R$ 377,45.

Status técnico anterior: **BUG-004 RESIDUAL IMPLEMENTADO / TESTADO ESTRUTURALMENTE**.

## Homologação oficial — 12/08/2026

O proprietário validou manualmente a correção residual no servidor oficial `http://127.0.0.1:4178/`, com o bundle `0.68.0-bug004-residual-card-notifications` e o ZIP de referência `11.22.48.zip`.

- Nubank: Meus Cartões e Notificações exibiram o mesmo total pendente de R$ 262,50;
- Nubank: somente um item `Fatura vencida`, eliminando a duplicidade e o estado histórico obsoleto;
- Caixa: Meus Cartões e Notificações exibiram R$ 62,50;
- Caixa: estado `Fatura fechada`, com vencimento em 17/08/2026;
- competência, valor pendente e estado atual ficaram coerentes;
- BUG-003, BUG-006 e BUG-007 permaneceram preservados.

Status oficial: **BUG-004 HOMOLOGADO PELO PROPRIETÁRIO EM 12/08/2026**.
