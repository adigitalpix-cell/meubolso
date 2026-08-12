# BUG-003 — CARTÕES: RESUMO X DETALHE

## Status

HOMOLOGADO PELO PROPRIETÁRIO.

Data: 2026-08-11. Homologação: `ncgfwatsciwzzhqlspvy`. Servidor oficial: `http://127.0.0.1:4178/`.

## Evidência real

Foram localizadas em homologação exatamente três compras `cartao nu teste 11.8`, todas ligadas ao cartão Nubank `d6ed89a3-4e4a-49da-8d97-d6b48dcd4151`, fechamento dia 1 e vencimento dia 7.

| Compra | ID | Valor | Parcelas | `data_compra` | Estado real das parcelas |
|---|---|---:|---:|---|---|
| A | `3185f68e-fd00-4d8b-ab06-6dc56ebcdec5` | R$ 19,53 | 4 | 2026-09-01 | 4 pagas; vencimentos 2026-09-01 a 2026-12-01 |
| B | `f82ecffb-76ac-45d8-ac93-59654d09c821` | R$ 12,07 | 2 | 2026-09-01 | 2 pagas; vencimentos 2026-09-01 e 2026-10-01 |
| C | `e3b73990-ad06-40b3-bd99-4bd0081613f4` | R$ 19,52 | 2 | 2026-09-01 | 2 pendentes; vencimentos 2026-09-01 e 2026-10-01 |

Os oito IDs de parcelas foram lidos e relacionados às respectivas compras. Não houve escrita ou correção dos registros reais.

## Rastreamento real

Data de referência: 2026-08-11.

| Etapa | Compras A/B/C | Competência/mês-alvo | Resultado anterior |
|---|---|---|---|
| `compras_cartao` | Entraram | `data_compra` 2026-09-01 | Mantidas |
| `parcelas` | Entraram | primeira parcela 2026-09 | Mantidas |
| `cardInstallmentItems()` | Entraram | `dueMonthKey` 2026-09 na primeira parcela | Mantidas |
| `cardInvoiceItems()` | Não entraram | alvo padrão 2026-08 | Descartadas por `dueMonthKey(item) !== targetMonth` |
| `cardPendingInvoiceItems()` | Não receberam itens | herdava coleção vazia | Ausentes |
| `cardPurchasesTemplate()` | Não recebeu itens | chamava `cardInvoiceItems(selectedCardId)` | Ausentes da tela |

O primeiro descarte era a comparação de competência em `cardInvoiceItems()`, não o status pago.

## Causa raiz

Depois da primeira correção, `cardInvoiceItems()` ganhou `monthKey()` como alvo padrão. Em 11/08/2026 isso significava agosto. Entretanto, o Nubank fecha no dia 1 e `saveCardPurchase()` registra a compra posterior ao fechamento na fatura seguinte, com referência 01/09/2026. Assim, pagas e pendentes novas eram descartadas antes da separação por status.

## `currentInvoice()`

`currentInvoice()` calcula agosto por `installmentInfo(purchase, monthKey())` e considera as compras de setembro ainda inativas. Essa função diverge do modelo por fechamento, mas não é chamada por `cardPurchasesTemplate()` nem por `payablesCardGroups()`.

Conclusão: `currentInvoice()` não participa da causa direta da tela Compras do Cartão. Seus usos em notificações, Dashboard e resumos legados permanecem fora deste escopo, preservando o BUG-004.

## Correção

- Criado `cardInvoiceTargetMonth(cardId)`, que deriva a competência por `monthKey(invoiceClosingDate(cardId))`.
- `cardInvoiceItems()` usa esse alvo quando o chamador não informa um mês explícito.
- `payablesCardGroups()` percorre cada cartão e chama `cardPendingInvoiceItems(card.id)`, respeitando o fechamento específico de cada cartão.
- `cardPurchasesTemplate()` usa a mesma competência calculada para o cartão selecionado.
- A coleção completa continua incluindo pagos e pendentes.
- O total continua filtrando somente itens pendentes.

Para o Nubank no cenário real, resumo e detalhe passam a usar 2026-09.

## Testes

Passaram os cenários controlados exigidos em conjunto com BUG-007:

- 4x com 0, 1, 2 e 4 parcelas pagas;
- compra simples paga e simples pendente;
- alvo do Nubank em setembro;
- três compras equivalentes às reais visíveis na competência;
- pagas e pendente preservadas;
- total pendente de R$ 9,76 no conjunto real equivalente;
- oito parcelas preservadas no histórico;
- ausência de duplicidade;
- prova estática de que `cardPurchasesTemplate()` não chama `currentInvoice()`.

Também passaram `node --check app.js`, `node --check sw.js` e `git diff --check`. O bundle servido na porta 4178 corresponde ao worktree e não apresentou erro JavaScript na tela de login.

## Escopo preservado

Nenhuma compra ou parcela real foi alterada. BUG-004, banco, Auth, RLS, policies, migrations e produção permaneceram intactos.

## Homologação manual

Em 2026-08-11, o proprietário aprovou o comportamento corrigido e autorizou o registro formal do BUG-003 como homologado. A homologação preserva a regra de competência por fechamento, a exibição de itens pagos e pendentes e o total composto somente por pendências.
