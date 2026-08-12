# BUG-009 — Receitas recorrentes voltam após editar/excluir

Data: 12/08/2026.

Status: **HOMOLOGADO PELO PROPRIETÁRIO EM 12/08/2026**.

## Sintoma reproduzido

Receitas mensais editadas para `Não repete` ou excluídas podiam reaparecer após refresh/reload. O submit e a exclusão aplicavam o plano temporal somente às despesas; receitas alteravam ou removiam apenas o UUID selecionado.

## Causa raiz

- `monthlyIncomeSeriesToken()` derivava a identidade das receitas originais de nome, valor, categoria, conta e dia, todos campos mutáveis.
- `ensureMonthlyIncomeOccurrences()` encontrava ocorrências históricas ainda marcadas como `fixed` e recriava o mês ausente.
- Não havia marcador persistente de encerramento para receitas.
- `monthlyExpenseEditPlan()` e `monthlyExpenseDeletePlan()` não possuíam equivalente para receitas.

Primeiro ponto incorreto: o fluxo de submit/exclusão tratava séries apenas quando `type === expense`, deixando receitas no fluxo unitário.

## Solução

- A coluna textual existente `receitas.recorrencia` passa a transportar, sem migration, o tipo, a identidade estável e o encerramento da série.
- Receitas legacy continuam aceitas; no primeiro tratamento temporal recebem o token estável derivado da série anterior.
- `monthlyIncomeEditPlan()` altera somente a competência selecionada e futuras.
- `monthlyIncomeDeletePlan()` converte a competência atual/futuras em marcadores persistentes de encerramento, ocultos da interface.
- `ensureMonthlyIncomeOccurrences()` considera identidade e encerramento, usa UUID determinístico e faz rollback local se a persistência falhar.
- Receitas novas mensais recebem identidade estável no cadastro.
- Receitas anteriores, recebidas ou pendentes, não são alteradas.

## UX

Os cards de Receitas a Receber e Receitas Recebidas mostram discretamente `Mensal` ou `Não repete` junto à data. Os badges financeiros `A receber`, `Recebido` e `Atrasado` permanecem independentes.

## Testes estruturais

20/20 cenários aprovados, cobrindo:

- identidade legacy e estável;
- edição de valor, descrição e categoria da competência atual/futuras;
- mensal → não repete;
- não repete → mensal;
- exclusão e encerramento atual/futuras;
- histórico passado recebido preservado;
- simulação de refresh pela codificação/decodificação de `recorrencia`;
- três execuções de geração sem duplicidade;
- zero geração após encerramento;
- cards com `Mensal` e `Não repete`;
- status financeiro preservado.

Validações técnicas: `node --check app.js`, `node --check sw.js` e `git diff --check` aprovados. O servidor oficial 4178 entrega o bundle do worktree e não apresentou erro crítico na abertura.

## Limites

Não houve alteração de schema, migration, banco real, Auth, RLS, policies ou produção. BUG-001 e BUG-008 foram preservados.

## Homologação manual

O proprietário testou e aprovou:

- identificação da receita mensal;
- alteração `Mensal → Não repete`;
- salvamento;
- refresh/reload preservando `Não repete`;
- exclusão da receita recorrente;
- ausência de reaparecimento após exclusão;
- regra temporal aplicada à competência atual e futuras;
- histórico anterior preservado;
- tipo de repetição exibido no card.

Resultado oficial: **BUG-009 HOMOLOGADO PELO PROPRIETÁRIO**. BUG-001 e BUG-008 permaneceram preservados.
