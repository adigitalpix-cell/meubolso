# MEU BOLSO — MÉTODO OFICIAL DE TRABALHO

## Objetivo

Este método organiza um trabalho rápido, preventivo e rastreável. Ele existe para facilitar a evolução do MEU BOLSO, reduzir regressões e deixar responsabilidades claras, sem criar gates ou bloqueios burocráticos.

O fluxo é recomendado. O proprietário pode abreviá-lo, reordená-lo ou autorizar avanço direto quando isso for tecnicamente seguro. Permanecem protegidos segurança, integridade dos dados, credenciais, produção e o escopo autorizado, conforme DEC-019.

## Responsabilidades

### ChatGPT — Coordenador / Analista

- receber relatos, prints, testes e requisitos do proprietário;
- analisar o problema antes de solicitar execução técnica;
- separar bug, melhoria UX, regra de negócio, regressão, runtime/cache e problema de dados;
- realizar precheck de impacto quando pertinente;
- identificar riscos e dependências;
- definir estratégia de investigação ou correção;
- preparar prompts objetivos e cirúrgicos para o Codex;
- revisar criticamente o relatório do Codex;
- confrontar testes estruturais com resultados reais do proprietário;
- orientar o próximo teste;
- organizar prioridades.

ChatGPT não substitui a homologação do proprietário.

### Proprietário — Decisor / Homologador

- definir o comportamento esperado;
- aprovar regras de negócio;
- solicitar implementações e melhorias;
- definir prioridades;
- realizar testes manuais e reais;
- aprovar ou rejeitar resultados;
- homologar implementações;
- autorizar mudanças de escopo.

A decisão final sobre produto e processo pertence ao proprietário, preservados riscos técnicos concretos, segurança e integridade dos dados.

### Codex — Executor Técnico

- inspecionar o repositório real;
- localizar o fluxo funcional envolvido;
- reproduzir o problema quando possível;
- comprovar a causa raiz antes de correções relevantes;
- implementar somente o escopo autorizado;
- executar testes técnicos proporcionais ao impacto;
- proteger funcionalidades e bugs homologados contra regressão;
- utilizar o servidor local oficial;
- atualizar somente a documentação necessária;
- informar riscos residuais.

Codex não deve:

- decidir sozinho uma regra de negócio ambígua;
- declarar homologação em nome do proprietário;
- ampliar o escopo desnecessariamente;
- iniciar outro bug sem autorização;
- transformar documentação em impedimento absoluto ao desenvolvimento.

## Fluxo oficial recomendado

```text
RELATO REAL DO PROPRIETÁRIO
↓
ANÁLISE DO CHATGPT
↓
PRECHECK DE IMPACTO QUANDO NECESSÁRIO
↓
PROMPT CIRÚRGICO
↓
CODEX INVESTIGA
↓
CAUSA COMPROVADA
↓
IMPLEMENTAÇÃO MÍNIMA
↓
TESTES TÉCNICOS
↓
TESTE REAL DO PROPRIETÁRIO
↓
APROVAÇÃO / REJEIÇÃO
↓
HOMOLOGAÇÃO
↓
DOCUMENTAÇÃO CONSOLIDADA
```

O proprietário pode abreviar ou reordenar esse fluxo quando tecnicamente seguro. Uma correção localizada não exige, por padrão, repetir auditorias amplas ou etapas documentais sem relação direta.

## Princípio de eficiência

Para bugs e melhorias localizadas, preferir:

- um problema principal por rodada;
- escopo pequeno;
- investigação focada;
- correção mínima;
- testes diretamente relacionados;
- regressão proporcional ao risco.

Evitar como padrão:

- auditorias completas repetidas;
- reanálise de módulos não afetados;
- reexecução de testes sem relação com a mudança;
- documentação extensa a cada microajuste;
- alterações preventivas sem evidência;
- refatorações oportunistas fora do escopo.

Auditorias amplas continuam adequadas quando justificadas por:

- mudanças arquiteturais;
- banco ou migrations;
- Auth;
- RLS ou policies;
- segurança;
- preparação para produção;
- grande conjunto de alterações acumuladas.

## Precheck de impacto

Antes de uma implementação relevante, verificar rapidamente:

1. Qual regra de negócio deve permanecer verdadeira?
2. Quais funções realmente participam do fluxo?
3. Onde existe estado local e remoto?
4. Existe uso de DOM ou evento transitório depois de `await`?
5. Uma escrita confirmada pode ser transformada em falso erro por refresh?
6. Cache, service worker ou versionamento podem interferir?
7. Existem duas funções calculando o mesmo conceito de formas diferentes?
8. Existem operações remotas multi-etapas sem transação?
9. O fluxo diferencia corretamente status de entidade e status de subitem?
10. Edição ou exclusão pode modificar histórico indevidamente?
11. Timeout pode acontecer depois da persistência remota?
12. Quais funcionalidades homologadas podem sofrer regressão?

O precheck deve ser curto. Quando as respostas forem evidentes, basta registrar as conclusões úteis para a execução; não é necessário gerar relatório extenso.

## Padrões de risco já aprendidos

- referência transitória de evento ou DOM utilizada depois de `await`;
- escrita remota concluída seguida de refresh falho produzindo falso erro;
- bundle, cache ou service worker desatualizado;
- resumo e detalhe usando regras diferentes de competência;
- status de compra aplicado incorretamente a todas as parcelas;
- recorrência identificada por campos mutáveis;
- exclusão de recorrência sem encerramento persistente;
- operações Master multi-etapas sem reconciliação;
- diferenças de schema entre ambientes;
- confusão entre pago, parcialmente pago, pendente e totalmente quitado.

Esses riscos devem ser consultados quando forem relevantes ao fluxo alterado. Não devem ser testados mecanicamente em toda execução.

## Servidor local oficial

DEC-020 permanece integralmente válida:

- origem: `http://127.0.0.1:4178/`;
- pasta servida: `C:\Projetos\meubolso`;
- Codex e proprietário usam a mesma origem nas validações locais;
- não criar porta alternativa sem necessidade técnica expressamente justificada;
- quando houver exceção, documentar a razão e retornar à porta 4178.

## Testes e homologação

Os testes executados pelo Codex são testes técnicos ou estruturais. Eles não equivalem automaticamente a homologação.

Um resultado como `20/20 testes aprovados` comprova apenas o escopo daqueles testes. Quando o fluxo exige validação manual ou real, o estado muda para homologado somente após aprovação expressa do proprietário.

Implementado, testado, homologado, commitado e publicado continuam sendo estados distintos, conforme DEC-011.

## Documentação eficiente

Durante investigação ou microcorreção, atualizar somente a documentação diretamente necessária.

Em fechamentos relevantes, consolidar quando isso trouxer rastreabilidade real:

- `STATUS_ATUAL.md`;
- `MATRIZ_ECS_BUGS_REGRESSAO.md`;
- `HANDOFF_ATUAL.md`;
- `PROXIMA_RETOMADA.md`;
- `ESTADO_POR_FUNCIONALIDADE.md`;
- relatório oficial do dia.

Não repetir este método integralmente em outros documentos. Os arquivos centrais devem apontar para este documento para evitar duplicação e divergência.

## Regra de encerramento

Nenhuma execução deve terminar sem direção clara. O Codex deve encerrar com uma destas formas:

```text
PRÓXIMA AÇÃO RECOMENDADA:
[uma ação objetiva]
```

ou, quando depender de decisão ou teste:

```text
AGUARDANDO PROPRIETÁRIO:
[uma ação objetiva necessária]
```

Exemplos:

```text
AGUARDANDO PROPRIETÁRIO:
testar cadastro de usuário.
```

```text
PRÓXIMA AÇÃO RECOMENDADA:
investigar BUG-004 após autorização.
```

A próxima ação nunca deve ser iniciada automaticamente.

## Autoridade e não bloqueio

Este método orienta, previne regressões, melhora eficiência e organiza responsabilidades. Ele não impede uma implementação expressamente solicitada pelo proprietário.

Nos termos da DEC-019, uma autorização expressa pode mudar processo, prioridade ou dispensar uma etapa documental. Continuam obrigatórios os limites técnicos reais:

- segurança;
- integridade dos dados;
- proteção de credenciais;
- limites do escopo autorizado;
- cuidados com produção.

Riscos concretos devem ser comunicados objetivamente e tratados da forma mais segura possível. A documentação deve facilitar e registrar a execução autorizada.
