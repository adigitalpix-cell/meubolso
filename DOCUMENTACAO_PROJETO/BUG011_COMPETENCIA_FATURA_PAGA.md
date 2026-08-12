# BUG-011 — Competência da fatura paga

Data: 12/08/2026.

Status: **HOMOLOGADO PELO PROPRIETÁRIO E PUBLICADO NA RELEASE 0.68.3 EM 12/08/2026**.

## Sintoma

Em 12/08/2026, o Mercado Pago apresentava parcelas pendentes com vencimento em 07/09/2026 e total de fatura de setembro, mas o resumo de Meus Cartões exibia `Vencida há 5 dias`. A data usada pelo status era 07/08/2026.

O Histórico de Parcelas estava correto: agosto pago e setembro pendente. As datas persistidas não foram alteradas.

## Diagnóstico e primeiro ponto de divergência

- `cardInvoiceTargetMonth()` selecionava `2026-09` no cenário reproduzido;
- `dueMonthKey()` retornava `2026-09` para as parcelas de 07/09/2026;
- `cardInvoiceItems()` e `cardPendingInvoiceItems()` mantinham essas parcelas em setembro;
- a fatura de agosto, com total pendente zero, não permanecia na coleção ativa;
- `cardInvoiceGroupStatus()` chamava `cardInvoiceDueDate()`, que ignorava a competência da coleção e montava o vencimento no mês civil corrente;
- em 12/08/2026, essa regra gerava 07/08/2026 e o falso estado `Vencida há 5 dias`;
- a fonte visual de notificações repetia a mistura ao combinar itens da competência alvo com datas do mês civil corrente.

Primeiro ponto de divergência: **`cardInvoiceGroupStatus()` → `cardInvoiceDueDate()`**, com a mesma causa em `cardCurrentInvoiceNotificationStates()` → `cardCurrentInvoiceCycleDates()`.

## Correção mínima

- a competência programada por fechamento foi isolada em `cardScheduledInvoiceMonth()` e continua sendo usada na criação/prévia do BUG-008;
- `cardInvoiceTargetMonth()` passou a selecionar a competência pendente mais antiga do cartão, usando a programada apenas quando não há parcela pendente;
- fechamento e vencimento passaram a ser derivados da mesma competência selecionada;
- `cardInvoiceDueDate()` deixou de usar o mês civil corrente;
- Meus Cartões, Compras do Cartão e notificações passam a consumir competência e datas coerentes.

Não houve alteração nas datas das parcelas, no histórico, no rateio, no banco ou na persistência.

## Testes estruturais

Foram aprovadas 21 verificações controladas, incluindo os 17 casos obrigatórios:

1. agosto pendente;
2. agosto integralmente pago e setembro pendente;
3. agosto parcialmente pago;
4. agosto pago no vencimento;
5. agosto pago após o vencimento;
6. setembro com uma parcela;
7. setembro com várias compras;
8. setembro paga;
9. dois cartões com vencimentos diferentes;
10. virada agosto → setembro;
11. virada dezembro → janeiro;
12. cronograma histórico do BUG-008;
13. total e competência iguais entre resumo e detalhe;
14. notificações usando a mesma competência;
15. fatura sem pendências não vencida;
16. total pendente zero;
17. filtro explícito por mês preservado.

No stub equivalente ao print real, Bike R$ 98,33 + Mala Stanley R$ 151,18 + Serra Mármore R$ 29,29 resultaram em R$ 278,80, competência `2026-09`, vencimento 07/09/2026 e status não vencido.

## Arredondamento observado

A diferença entre R$ 278,80 no stub e R$ 278,79 observado na evidência real não foi produzida nem corrigida pelo BUG-011. Ela pode depender do rateio dos valores originais das compras. Permanece como potencial defeito independente, ainda indeterminado, sem ampliação de escopo.

## Validação técnica e limites

- `node --check app.js`: aprovado;
- `node --check sw.js`: aprovado;
- `git diff --check`: aprovado;
- servidor oficial: `http://127.0.0.1:4178/`;
- bundle servido idêntico ao `app.js` do worktree por SHA-256;
- nenhum erro crítico de JavaScript no carregamento da tela de login.

BUG-003, BUG-004, BUG-007 e BUG-008 foram preservados estruturalmente. BUG-009, BUG-010, recorrências e rascunhos não foram alterados.

Banco, schema, Auth, RLS, policies e produção não foram alterados. Não houve commit, push ou deploy.

## Teste manual solicitado antes da homologação

Antes da homologação final, foi solicitado ao proprietário testar manualmente o Mercado Pago e confirmar que a fatura paga de agosto não permanecia vencida e que as parcelas com vencimento em 07/09 apareciam na competência setembro. A homologação foi posteriormente concluída e está registrada ao final deste documento.

## Residual — visibilidade de fatura futura

Após a correção principal, o proprietário confirmou parcialmente que R$ 278,79, competência setembro e `Vence em 26 dias` estavam corretos. Foi identificado um residual visual: ainda em agosto, o card oferecia `Pagar Fatura`, `Ver/Ocultar compras` e a lista de itens de setembro.

O bloco `payablesCardGroupTemplate()` não possuía guarda de competência: pagamento dependia apenas de total positivo, o controle era sempre renderizado e a lista dependia somente do estado global de expansão. A comparação com o `HEAD` confirmou que essa condição já existia antes do diff do BUG-011; o residual ficou visível quando a competência futura passou a ser corretamente apresentada.

A correção residual compara `cardInvoiceTargetMonth(card.id)` com `monthKey()` e restringe somente as ações e detalhes de cartões cadastrados. Valor e status informativo continuam visíveis. Ao entrar na competência, pagamento, expansão e lista voltam a ficar disponíveis. A comparação usa `AAAA-MM`, incluindo virada de ano.

Foram aprovadas 14 verificações controladas para agosto→setembro, competência corrente, fatura paga com próxima fatura futura, dezembro→janeiro e total zero. A correção principal e o status de homologação manual pendente foram preservados.

## Residual 2 — ações por estado e alinhamento do menu

O teste manual posterior mostrou que a guarda exclusiva de competência ocultava também as ações de uma fatura vencida com saldo. Mostrou ainda `Ver compras` em cartão com total zero e deslocamento do menu ⋮ quando o botão intermediário era removido.

A regra foi refinada no mesmo `payablesCardGroupTemplate()`:

- vencida ou competência atual, com saldo e itens pertinentes: pagamento e expansão disponíveis;
- futura: somente valor, status e menu;
- total zero ou ausência de itens pertinentes: sem pagamento, expansão ou lista vazia;
- menu ⋮ continua sempre presente e possui margem automática própria quando não há controle adjacente;
- quando Ver/Ocultar existe, o agrupamento original com o menu é preservado.

A guarda anterior baseada somente na competência fica, portanto, substituída por esta matriz de estado + saldo + itens. Foram aprovadas 15 verificações controladas, incluindo Nubank vencido, Caixa futura, Neon zerado, fatura vencida sem itens, virada de ano e total/detalhe.

## Homologação oficial

O proprietário aprovou a correção principal e os dois residuais em 12/08/2026. Nubank vencido manteve Pagar Fatura, compras e expansão; Caixa futura manteve valor/status sem ações antecipadas; Neon zerado não exibiu ações nem lista vazia; o menu ⋮ permaneceu à direita nos três estados. O BUG-011 integra a release `0.68.3`.
