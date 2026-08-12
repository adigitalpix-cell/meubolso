# BUG-007 — PAGAMENTO INICIAL DE COMPRA PARCELADA

## Status

HOMOLOGADO PELO PROPRIETÁRIO.

Data: 2026-08-11. Homologação: `ncgfwatsciwzzhqlspvy`. Produção não alterada.

## Evidência real

Duas compras reais de teste confirmaram o problema:

- compra 4x marcada como paga: quatro parcelas nasceram pagas;
- compra 2x marcada como paga: duas parcelas nasceram pagas.

Uma terceira compra 2x pendente nasceu com duas parcelas pendentes.

## Fluxo anterior

`purchaseFormTemplate()` oferecia apenas status `Pendente` ou `Pago`. Ao salvar:

```text
status === "paid"
→ allInstallmentKeys(purchase)
→ purchase.paidInstallments recebe todas as chaves
→ ensureInstallmentPayments()
→ purchaseInstallmentRows()
→ todas as parcelas persistidas como pago
```

O ponto exato estava em `saveCardPurchase()`, tanto para inclusão quanto edição: `purchase.paidInstallments = allInstallmentKeys(purchase)`.

## Causa raiz

O modelo já suportava status individual em `paidInstallments` e na tabela `parcelas`, mas o formulário não coletava quantidade inicial paga. O status geral `Pago` era traduzido incorretamente como “todas as parcelas pagas”.

## Nova regra

- Compra de uma parcela: paga = 1; pendente = 0.
- Compra parcelada com status Pago: informar `Parcelas já pagas`, de 0 até o total.
- As primeiras N parcelas recebem status pago.
- As demais permanecem pendentes ou atrasadas conforme a regra existente.
- O valor pendente e o limite consideram somente parcelas não pagas.

## UX

O modal Nova Compra reutiliza a estrutura existente e mostra `Parcelas já pagas` somente quando:

- Pagamento está em `Parcelado`; e
- Status está em `Pago`.

O campo é numérico, inteiro, mínimo 0 e máximo igual à quantidade total. Alterações em status ou quantidade atualizam sua visibilidade e limite sem recarregar a tela.

## Correção

- Criado `initialPaidInstallmentKeys(purchase, paidCount)`.
- `saveCardPurchase()` valida a quantidade antes de confirmar/salvar.
- Inclusão e edição atribuem apenas as primeiras N chaves.
- Metadados de pagamento são criados somente para chaves pagas.
- `purchaseInstallmentRows()` mantém o status individual já suportado.
- O cálculo de limite considera a quantidade efetivamente pendente.

## Testes

Passaram:

| Cenário | Resultado |
|---|---|
| 4x / 0 pagas | 4 pendentes |
| 4x / 1 paga | paga, pendente, pendente, pendente |
| 4x / 2 pagas | paga, paga, pendente, pendente |
| 4x / 4 pagas | 4 pagas |
| simples paga | 1 paga |
| simples pendente | 1 pendente |

Também foram validados histórico individual, total pendente, ausência de atribuição direta de todas as chaves e integração com a competência corrigida do BUG-003.

## Dados existentes

As três compras reais não foram recalculadas nem alteradas. Caso o proprietário queira ajustar seus estados, isso deverá ser uma ação manual separada e explicitamente autorizada.

## Escopo preservado

BUG-004, receitas, despesas, recorrências, Master, Auth, cache/fila, banco, RLS, policies, migrations e produção não foram alterados.

## Homologação manual

Em 2026-08-11, o proprietário aprovou o fluxo de compra parcelada com quantidade inicial paga e autorizou o registro formal do BUG-007 como homologado. O estado individual das parcelas, o histórico e o total pendente permanecem como regras oficiais.
