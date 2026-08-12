# BUG-001 — RECORRÊNCIA DUPLICADA

## Status

HOMOLOGADO PELO PROPRIETÁRIO.

Nenhum dado real foi alterado pela implementação estrutural. O proprietário concluiu posteriormente a validação manual no servidor local oficial `http://127.0.0.1:4178/`.

O proprietário aprovou criação, edição mensal → fixa/não recorrente, exclusão e persistência do encerramento após refresh. A recorrência excluída não reapareceu e o histórico anterior permaneceu preservado.

## Regra temporal oficial

> Editar ou excluir uma recorrência mensal afeta somente a competência atual e as futuras. Competências anteriores permanecem preservadas no histórico.

- PASSADO = imutável e preservado, inclusive pagamentos.
- EDITAR = atual e futuras são alteráveis.
- EXCLUIR = atual é encerrada/ocultada e futuras não são geradas.

## Reprodução anterior à correção

O modelo anterior agrupava despesas mensais por `nome + valor + categoria + conta`. Ao editar um desses campos somente na ocorrência selecionada, a ocorrência editada passava a formar outro grupo. Na competência seguinte, `ensureMonthlyExpenseOccurrences()` gerava uma ocorrência para o grupo histórico e outra para o grupo editado.

Em stub controlado:

- editar o valor de fevereiro de R$ 100 para R$ 120 gerou duas ocorrências em março, com UUIDs diferentes;
- mudar fevereiro de `fixed` para `none` deixou janeiro ativo e gerou indevidamente março.

## Causa raiz

- não existia `recurrenceId`/`seriesId` persistente;
- a identidade da série dependia de campos mutáveis;
- a edição alterava somente o registro selecionado;
- a geração usava UUID aleatório;
- a série histórica continuava ativa ao selecionar “não repete”.

Classificação das hipóteses:

| Hipótese | Resultado |
|---|---|
| H1 — edição cria novo ID de recorrência | Confirmada conceitualmente: não havia ID estável e a chave mudava |
| H2 — ocorrência antiga permanece ativa | Confirmada |
| H3 — série não é atualizada | Confirmada |
| H4 — geração não reconhece ocorrência existente | Confirmada quando a chave mutável diverge |
| H5 — competência/data falha | Descartada como causa primária |
| H6 — edição dispara create em vez de update | Descartada para o registro selecionado; o `upsert` preservava seu UUID |
| H7 — geração dupla por ordem de eventos | Descartada como causa primária |
| H8 — refresh repete geração | Descartada como causa primária |
| H9 — local e remoto usam IDs diferentes | Confirmada para ocorrências futuras, antes aleatórias e sem identidade de série |
| H10 — série antiga não é encerrada | Confirmada |

## Residual legacy reproduzido

O fluxo anterior de exclusão executava `DELETE` somente no UUID selecionado. Ao excluir março, janeiro e fevereiro permaneciam com `recorrencia = fixed`. Como não havia marcador persistente de encerramento, o refresh carregava esses registros históricos e `ensureMonthlyExpenseOccurrences()` derivava novamente o token legacy, recriando março com novo UUID e os dados antigos.

Reprodução fictícia comprovada:

- janeiro e fevereiro: históricos pagos e preservados;
- março: editado, recebeu token `legacy-*` e foi excluído pelo fluxo antigo;
- geração seguinte: março foi recriado a partir de janeiro/fevereiro;
- regra que o identificava novamente: `repeat === fixed` nos históricos + token derivado da chave legacy.

## Regra da série

A identidade estável é `recurrenceId`. A identidade de uma ocorrência é:

`recurrenceId + competência YYYY-MM`

Para novas séries, `recurrenceId` é criado uma única vez. Para séries legadas ainda sem marcador, um token determinístico é derivado da chave histórica anterior; ao editar, esse token passa a ser persistido. O UUID de cada nova ocorrência também é determinístico a partir da série e competência.

O vínculo ativo é armazenado no campo técnico existente `despesas.origem`, com prefixo `manual-recurring:`. O encerramento persistente usa `manual-recurring-ended:`. Não houve mudança de schema ou migration. Itens de cartão preservam suas origens próprias.

## Correção

- `fromSupabaseRows()` lê o marcador da série sem expô-lo como origem de cartão.
- `transactionToSupabaseRow()` e `toSupabaseRows()` preservam o marcador em `origem`.
- `monthlyExpenseEditPlan()` identifica a série antes de alterar campos mutáveis, preserva meses anteriores e atualiza a ocorrência selecionada e as futuras.
- A mudança `fixed → none` mantém um marcador de encerramento; a série histórica deixa de gerar novas competências sem apagar lançamentos anteriores.
- A mudança `none → fixed` cria uma única identidade de série.
- `ensureMonthlyExpenseOccurrences()` agrupa pelo token estável, usa UUID determinístico, recusa uma segunda ocorrência na mesma competência e reverte a inserção local se a persistência falhar.
- Uma falha de refresh posterior a uma escrita de série confirmada não recria a série nem altera seus IDs.
- `monthlyExpenseDeletePlan()` converte somente a ocorrência atual e eventuais futuras em marcadores ocultos de encerramento, preservando integralmente o passado.
- O marcador mantém o UUID existente, grava valor zero e `repeat = none`, não aparece em telas/totais e impede a reconstrução por históricos legacy.
- `deleteTransaction()` persiste os marcadores em lote; falha de escrita restaura o estado local e retry reutiliza os mesmos UUIDs.

## Testes estruturais

Funções reais do `app.js` foram extraídas e executadas em contexto isolado com stubs, sem Supabase real.

| Cenário | Séries | Ocorrências na competência seguinte | Resultado |
|---|---:|---:|---|
| Editar valor | 1 | 1 | Aprovado |
| Editar descrição | 1 | 1 | Aprovado |
| Editar categoria | 1 | 1 | Aprovado |
| Editar dia/data | 1 | 1 | Aprovado; preserva a competência e aplica o novo dia |
| Recorrente → não recorrente | 1 encerrada | 0 | Aprovado |
| Não recorrente → recorrente | 1 | 1 | Aprovado |
| Salvar duas vezes | 1 | 1 | Aprovado; identidade preservada |
| Gerar três vezes | 1 | `1, 0, 0` novas | Aprovado |
| Refresh/round-trip de `origem` | 1 | identidade igual | Aprovado |
| Duas séries iguais no mesmo mês | 2 | 2, uma por série | Aprovado; UUIDs distintos |
| Falha de escrita simulada | 1 | 0 persistidas | Aprovado; estado local revertido |
| Offline/fila simulada | 1 | lote único | Aprovado; cache preservado |
| Nova mensal → excluir | 1 encerrada | 0 | Aprovado |
| Legacy mensal → excluir | 1 encerrada | 0 | Aprovado |
| Legacy paga → excluir | histórico pago intacto | 0 | Aprovado |
| Excluir → geração 3 vezes | 1 encerrada | `0, 0, 0` novas | Aprovado |
| Excluir → refresh/reload | 1 encerrada | 0 | Aprovado |
| Persistência falha/retry | mesmos UUIDs | 0 | Aprovado; rollback/retry idempotente |

Também aprovados: `node --check app.js`, `node --check sw.js` e `git diff --check`.

## Duplicidades históricas

Nenhum registro histórico real foi consultado, alterado ou apagado. A baseline já registra um grupo duplicado por `parcela_id`, fora desta correção. Eventuais duplicidades históricas de recorrência exigem levantamento e saneamento separados; esta implementação impede novas duplicidades no fluxo corrigido.

## Risco residual

Séries legadas distintas que tenham exatamente a mesma chave histórica (`nome`, `valor`, `categoria` e `conta`) não possuem metadado suficiente para serem distinguidas retroativamente até receberem um `recurrenceId`. Novas séries já recebem identidades independentes. Não foi feita inferência destrutiva nem alteração em massa. O marcador de encerramento permanece como linha técnica de valor zero em `despesas`; consumidores externos que consultem a tabela diretamente devem ignorar origens `manual-recurring-ended:`.

## Homologação manual

Evidência declarada pelo proprietário:

- criação: OK;
- edição mensal → fixa/não recorrente: OK;
- exclusão: OK;
- histórico anterior: preservado;
- refresh após exclusão: recorrência não reapareceu.

Estado oficial: HOMOLOGADO PELO PROPRIETÁRIO.
