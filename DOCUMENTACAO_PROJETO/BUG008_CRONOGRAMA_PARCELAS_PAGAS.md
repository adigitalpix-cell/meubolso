# BUG-008 — Cronograma de parcelas já pagas e prévia discreta

Data: 12/08/2026.

Status: **HOMOLOGADO PELO PROPRIETÁRIO EM 12/08/2026**.

## Sintoma reproduzido

Ao cadastrar uma compra parcelada com N parcelas já pagas, `saveCardPurchase()` usava `invoiceClosingDate(cardId)` como `purchaseDate`. `installmentDueDate()` avançava a partir dessa data e `initialPaidInstallmentKeys()` marcava as primeiras N datas futuras como pagas.

O mesmo ponto também explicava o dia incorreto: o cronograma partia do fechamento, e não do vencimento real do cartão.

## Causa raiz

Primeiro ponto incorreto: atribuição de `purchaseDate` em `saveCardPurchase()`.

Fluxo anterior:

`formulário → installments/paidInstallmentsCount/cardId → invoiceClosingDate() → purchaseDate → installmentDueDate() → initialPaidInstallmentKeys() → purchaseInstallmentRows()`.

Não existia recuo de N competências pagas.

## Correção

- `cardInvoiceTargetMonth()` permanece como fonte oficial da competência atual.
- `initialPurchaseInstallmentDate()` recua N competências e aplica o dia real de vencimento do cartão.
- `installmentDueDate()` avança por mês com ajuste seguro para fevereiro, ano bissexto e meses curtos.
- `purchaseInstallmentRows()` persiste as datas derivadas da mesma data-base mostrada na prévia.
- Compras existentes preservam `purchaseDate` e `installmentDueDates`; nenhuma compra real foi recalculada automaticamente.
- Transações auxiliares de parcelas pagas passam a usar o vencimento real da parcela em vez do primeiro dia do mês.

## Prévia

O modal Nova Compra possui um controle nativo `<details>` chamado `Prévia`, fechado por padrão. A lista é compacta e exibe data, número, valor e os estados `PAGO`, `FATURA ATUAL`, `VENCIDO`, `PRÓXIMA` e `PENDENTE`.

A prévia é recalculada ao alterar forma de pagamento, status, quantidade, valor ou parcelas já pagas. Abrir o modal a partir de outro cartão recalcula o cronograma para aquele cartão.

## Validações

- `6x/0`, `6x/1`, `6x/3`, `6x/6` e `12x/5`: aprovados estruturalmente.
- Vencimento futuro no dia 21: `21/05/2026` a `21/10/2026` no cenário 6x/3.
- Vencimento já ocorrido no dia 05: `05/05/2026` a `05/10/2026` no cenário 6x/3.
- Virada dezembro/janeiro, fevereiro e 2028 bissexto: aprovados.
- Prévia e `purchaseInstallmentRows()`: datas idênticas em todos os itens testados.
- Estados atual, vencido e próxima: aprovados estruturalmente.
- Servidor oficial `http://127.0.0.1:4178/` entrega o mesmo hash do `app.js` do worktree.
- Sem erro crítico de console na abertura da aplicação.

## Regressão e limites

BUG-003, BUG-004, BUG-007, total pendente, filtros de compras, notificações e competência oficial do cartão foram preservados. Não houve alteração de banco, schema, migration, Auth, RLS, policies ou produção.

## Homologação manual

O proprietário testou e aprovou os seguintes cenários:

- cartão com vencimento no dia 21: reconstrução das parcelas anteriores e identificação de `FATURA ATUAL`, `PRÓXIMA` e `PENDENTE`;
- Nubank, fechamento no dia 1 e vencimento no dia 7, compra 6x com 3 parcelas já pagas:
  - `07/06/2026 — 1/6 — PAGO`;
  - `07/07/2026 — 2/6 — PAGO`;
  - `07/08/2026 — 3/6 — PAGO`;
  - `07/09/2026 — 4/6 — FATURA ATUAL`;
  - `07/10/2026 — 5/6 — PRÓXIMA`;
  - `07/11/2026 — 6/6 — PENDENTE`.

Foram homologados o cronograma retroativo, a competência atual, os vencimentos nos dias 07 e 21, todos os estados apresentados e o comportamento discreto/recolhível da prévia. BUG-003, BUG-004 e BUG-007 permaneceram preservados.
