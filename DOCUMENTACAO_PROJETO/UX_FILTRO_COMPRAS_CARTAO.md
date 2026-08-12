# UX — FILTRO EM COMPRAS DO CARTÃO

## Status

HOMOLOGADO PELO PROPRIETÁRIO.

Data: 2026-08-11. Servidor oficial: `http://127.0.0.1:4178/`.

## Escopo

Foi adicionada somente uma camada visual de filtro sobre os itens já calculados por `cardInvoiceItems()`. As regras funcionais estabilizadas do BUG-003 e BUG-007 não foram modificadas.

## Filtros

- `Pendentes`: padrão ao abrir; mostra compras que ainda possuem pelo menos uma parcela não paga.
- `Pagos`: mostra somente compras com todas as parcelas pagas.
- `Filtrar por mês`: consulta a competência selecionada usando `cardInvoiceItems(cardId, month)`.
- `Atual`: retorna à fatura atual e ao filtro Pendentes.

## Regra por compra

A classificação usa `allInstallmentsPaid(item.purchase)`:

- 4x com 1, 2 ou 3 pagas permanece em Pendentes;
- 4x com 4 pagas aparece em Pagos;
- compra simples segue a mesma regra.

A classificação não depende apenas do status da parcela visível na competência.

## Total

O topo continua somando `invoiceItems.filter(item => !item.paid)`. O rótulo foi explicitado como `Total pendente`, inclusive quando a lista visual estiver em Pagos ou em um mês escolhido.

## Estado

O filtro não é persistido em banco, sessão ou localStorage. Retorna a Pendentes ao:

- trocar de cartão;
- sair e voltar à tela;
- concluir ou fechar a edição de uma compra;
- atualizar a aplicação.

## Visual

Controle compacto junto ao título da seção, com `select`, seletor mensal e botão Atual apenas quando necessário. Em telas estreitas, os controles quebram para uma segunda linha sem overflow horizontal.

## Testes

Passaram 18/18 cenários obrigatórios, incluindo compras simples, parceladas parcialmente pagas, totalmente pagas, troca de filtros, mês, retorno à fatura atual, refresh, troca de cartão, total, competência, duplicidade e preservação de BUG-003/BUG-007.

Também passaram `node --check app.js`, `node --check sw.js` e `git diff --check`.

## Homologação manual do proprietário

Homologado em 2026-08-11 no servidor oficial `http://127.0.0.1:4178/`.

| Cenário | Resultado |
|---|---|
| Pendentes | APROVADO |
| Pagos | APROVADO |
| Filtrar por mês | APROVADO |
| Compra parcialmente paga permanece em Pendentes | APROVADO |
| Parcela da competência já paga visível como PAGO dentro de compra ainda pendente | APROVADO |
| Compra totalmente paga aparece em Pagos | APROVADO |
| Total pendente | APROVADO |
| Visual discreto do filtro | APROVADO |

Fica registrada como regra oficial que Pendentes classifica o estado total da compra. Portanto, uma parcela paga pode aparecer com status `PAGO` nessa visualização quando a compra ainda possuir outra parcela não paga. Pagos contém somente compras totalmente quitadas. Filtrar por mês mostra os itens da competência selecionada, pagos e pendentes.

## Versionamento

- Bundle: `/app.js?v=0.68.0-card-purchase-filter`.
- Cache: `meu-bolso-v0.68.0-card-purchase-filter`.

## Preservação

Esta homologação é exclusiva da UX do filtro. O estado formal de BUG-003 e BUG-007 não foi modificado. BUG-004, banco, Auth, RLS, policies, produção e dados financeiros não foram alterados.

## Próxima ação

Aguardar nova autorização expressa do proprietário. Não iniciar BUG-004 ou outro bug automaticamente.
