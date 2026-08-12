# MATRIZ OFICIAL DE ECS, BUGS E REGRESSÃO

Estado confrontado com o worktree em 2026-08-10. “Implementada” significa código/artefato presente; não significa E2E nem homologação.

## EC-18

| EC | APR | Implementação | Teste estrutural | E2E real | Homologação do proprietário | Classificação oficial |
|---|---:|---:|---:|---:|---:|---|
| 18.1 | Sim | Sim | Sim | Não | Não comprovada | IMPLEMENTADA; TESTADA ESTRUTURALMENTE |
| 18.2 | Sim | Sim | Sim | Não | Não comprovada | IMPLEMENTADA; TESTADA ESTRUTURALMENTE |
| 18.3 | Sim | Sim | Sim | Não | Não comprovada | IMPLEMENTADA; remoção no banco de homologação registrada |
| 18.4 | Sim | Não como EC própria | — | Não | Não | APR CONCLUÍDA; resultados divididos nas ECs seguintes |
| 18.5 | Sim | Sim | Sim | Não | Não comprovada | IMPLEMENTADA; TESTADA ESTRUTURALMENTE |
| 18.6 | Sim | Sim | Sim | Não | Não comprovada | IMPLEMENTADA; TESTADA ESTRUTURALMENTE |
| 18.7 | Sim | Sim | Sim | Não | Não comprovada | IMPLEMENTADA; TESTADA ESTRUTURALMENTE |
| 18.8.1 | Sim | Sim | Sim | Não | Não comprovada | IMPLEMENTADA; TESTADA ESTRUTURALMENTE |
| 18.8.2 | Sim | Sim | Sim | Não | Não comprovada | IMPLEMENTADA; TESTADA ESTRUTURALMENTE |
| 18.9 | Sim | Sim | Sim + simulação isolada | Não | Não comprovada | IMPLEMENTADA; TESTADA ESTRUTURALMENTE |
| 18.10 | Sim | Não como EC própria | — | Não | Não | APR CONCLUÍDA; separada em 18.10.1 |
| 18.10.1 | Sim | Sim | Sim + simulação isolada | Não | Não comprovada | IMPLEMENTADA; TESTADA ESTRUTURALMENTE |
| 18.10.2 | Sim | Sim | Sim | Não | Não comprovada | IMPLEMENTADA; TESTADA ESTRUTURALMENTE |
| 18.10.3 | Sim | Sim | Sim | Não | Não comprovada | IMPLEMENTADA; TESTADA ESTRUTURALMENTE; encerra tecnicamente a materialização runtime |

O teste controlado com dados fictícios registrado para EC-18.1 não é classificado como E2E real. As homologações declaradas de EC-10, 12, 13, 14, 15 e 17 são evidência histórica do proprietário; seus artefatos detalhados não estão integralmente no pacote.

O bloco EC-18 está tecnicamente concluído no objetivo específico de impedir credenciais em objetos runtime, cache, fila e sessão. Isso não transforma testes estruturais em E2E ou homologação.

## Bugs oficiais

| Bug | Registro | Código provavelmente envolvido | Estado | EC de segurança alterou indiretamente? | Evidência de correção/homologação |
|---|---|---|---|---|---|
| BUG-001 — recorrência duplicada | `BUG001_RECORRENCIA_DUPLICADA.md` | submit de `#transaction-form`, `monthlyExpenseEditPlan()`, `monthlyExpenseDeletePlan()`, `deleteTransaction()`, `ensureMonthlyExpenseOccurrences()` | HOMOLOGADO PELO PROPRIETÁRIO | Não altera Auth, cartões ou segurança | 20 cenários estruturais + criação, edição, exclusão, histórico e ausência de reaparecimento confirmados manualmente |
| BUG-002 — cadastro Master inconsistente | `BUG002_CADASTRO_MASTER.md` | `saveUser()`, `saveUserOnce()`, `saveNewUserToSupabase()`, `loadUserByUsername()`, `refreshMasterData()` | HOMOLOGADO PELO PROPRIETÁRIO | Sim; preserva segurança de credenciais | Criação, mensagem, fechamento, lista e ausência de duplicidade confirmados manualmente |
| BUG-003 — resumo e detalhe de cartões divergentes | `BUG003_CARTOES_RESUMO_DETALHE.md` | `cardInvoiceTargetMonth()`, `cardInvoiceItems()`, `cardPendingInvoiceItems()`, `payablesCardGroups()`, `cardPurchasesTemplate()` | HOMOLOGADO PELO PROPRIETÁRIO | Não | Três compras reais rastreadas; 13 testes conjuntos e aprovação manual registrados |
| BUG-004 — notificação usa data/regra errada | `BUG004_NOTIFICACOES_CARTAO.md` | `cardInvoiceNotificationStates()`, `cardCurrentInvoiceNotificationStates()`, `cardInvoiceNotificationSources()`, `cardInvoicePushCandidates()`, `dueNotificationCandidates()`, `checkDueNotifications()` | HOMOLOGADO PELO PROPRIETÁRIO EM 12/08/2026 | Centro usa somente competência atual do BUG-003; push/PWA e BUG-003/006/007 preservados | Nubank único e coerente em R$ 262,50; Caixa fechada em R$ 62,50; 18/18 + 4/4 + 11/11 testes técnicos |
| BUG-005 — renovação Master não sincroniza | `BUG005_RENOVACAO_MASTER.md` | `renewUser()`, `updateUserFields()`, `saveRenewalToSupabase()`, `loadRenewalById()`, `refreshMasterData()` | HOMOLOGADO PELO PROPRIETÁRIO | Preserva EC-18; compartilha compatibilidade de projeção com BUG-002 | Teste manual de renovação aprovado pelo proprietário |
| BUG-006 — login bloqueado sem mensagem específica | `BUG006_LOGIN_BLOQUEADO.md` | `bindLogin()`, `isAccessBlocked()`, `accessRestrictionMessage()` | HOMOLOGADO PELO PROPRIETÁRIO | Não enfraquece Auth nem login legacy | 10 testes técnicos + bloqueio, ausência de sessão e mensagem exata confirmados manualmente |
| BUG-007 — pagamento inicial de compra parcelada | `BUG007_PAGAMENTO_INICIAL_COMPRA_PARCELADA.md` | `purchaseFormTemplate()`, `saveCardPurchase()`, `initialPaidInstallmentKeys()`, `purchaseInstallmentRows()` | HOMOLOGADO PELO PROPRIETÁRIO | Não | 4x com 0/1/2/4 pagas, compras simples e aprovação manual registrados |
| BUG-008 — cronograma retroativo e prévia de parcelas | `BUG008_CRONOGRAMA_PARCELAS_PAGAS.md` | `initialPurchaseInstallmentDate()`, `installmentDueDate()`, `purchaseInstallmentPreviewRows()`, `saveCardPurchase()`, `purchaseInstallmentRows()` | HOMOLOGADO PELO PROPRIETÁRIO EM 12/08/2026 | Preserva BUG-003/004/007 e usa `cardInvoiceTargetMonth()` | Testes estruturais completos + aprovação manual dos vencimentos 07/21, cronograma retroativo, estados e prévia recolhível |
| BUG-009 — receitas recorrentes reaparecem | `BUG009_RECEITAS_RECORRENTES.md` | `monthlyIncomeSeriesToken()`, `monthlyIncomeEditPlan()`, `monthlyIncomeDeletePlan()`, `ensureMonthlyIncomeOccurrences()`, submit/exclusão de transações | HOMOLOGADO PELO PROPRIETÁRIO EM 12/08/2026 | Reutiliza o padrão temporal do BUG-001 e preserva BUG-008 | 20/20 testes estruturais + aprovação manual de edição, refresh/reload, exclusão, histórico e tipo de repetição no card |
| BUG-010 — perda do cadastro em andamento | `BUG010_RASCUNHOS_FORMULARIOS.md` | helpers `formDraft*`, `openTransactionDialog()`, `purchaseFormTemplate()`, `bindPurchaseDraft()`, submits de transação/compra | HOMOLOGADO PELO PROPRIETÁRIO EM 12/08/2026 | Preserva BUG-001/008/009; não usa Supabase | 20/20 testes estruturais + aprovação manual de Receita, Despesa, Compra, navegação, refresh, campos dinâmicos, descarte, salvamento e isolamento |
| UX — filtro Compras do Cartão | `UX_FILTRO_COMPRAS_CARTAO.md` | `cardPurchasesTemplate()`, `filterCardPurchaseItems()`, `cardPurchaseFilterControls()` | HOMOLOGADO PELO PROPRIETÁRIO | Não | Pendentes, Pagos, mês, parcial em Pendentes, parcela paga visível, total e visual aprovados manualmente |

## Matriz recomendada de regressão futura

| Área | Cenários recomendados antes de homologar; o proprietário pode ajustar a seleção conforme o risco e o escopo |
|---|---|
| Login legacy | sucesso, senha inválida, usuário bloqueado/expirado, logout e segundo login |
| Login Auth | sessão válida/expirada, vínculo ausente, logout, restauração e isolamento |
| Master/Minha Conta | alternância repetida, geração atual, carga pessoal/Master e autorização |
| Cadastro público | validações, duplicidade, falha parcial, login posterior e ausência de senha no runtime/cache |
| Cadastro Master | persistência atômica, falha de cada etapa, mensagem única, rollback e novo login |
| Cache/fila/offline | nenhuma senha/token; operação de credencial bloqueada offline; cache antigo invalidado |
| Recorrência | editar atual+futuras, preservar passado, não duplicar, idempotência por mês |
| Cartões | regra de fechamento, resumo=detalhe, parcelas pagas preservadas e nenhum item oculto |
| Notificações | antes do fechamento, fechamento→vencimento, vencida e fatura paga sem alerta |
| PWA | `index.html`/`sw.js` consistentes, upgrade de cache, instalação limpa e atualização existente |
| Multiusuário/RLS futuro | isolamento completo, Master autorizado, anon/authenticated e anti-impersonação |

## Incidentes e riscos históricos relevantes

- Uma duplicidade excedente por `parcela_id` e uma parcela paga com múltiplas despesas auxiliares foram preservadas na baseline; não corrigir sem plano de dados.
- `card-installment` sem `parcela_id`: 101 registros na baseline, exigindo análise sem presumir que todos sejam erro.
- RLS/policies ausentes deixam o isolamento dependente do cliente.
- O cadastro Master ainda pode ter inicialização secundária parcial, mas a correção do BUG-002 preserva o usuário e informa o estado; BUG-002 foi homologado pelo proprietário.
- Os schemas históricos carregam uma credencial bootstrap fixa; o valor é deliberadamente omitido.
