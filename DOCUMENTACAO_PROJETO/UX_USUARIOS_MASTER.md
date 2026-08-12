# UX — USUÁRIOS MASTER

## Estado

**IMPLEMENTADO / TESTADO ESTRUTURALMENTE / TESTE MANUAL VISUAL PENDENTE.**

## Tela própria de criação

- `+ NOVO USUÁRIO` ativa `userFormOpen` e `usersTemplate()` retorna exclusivamente `userFormTemplate(null, true)`.
- A lista, filtros e cards não são renderizados sob o formulário de criação.
- O cabeçalho reutiliza o padrão de voltar existente no aplicativo.
- Voltar/Cancelar limpa `editingUserId`, fecha `userFormOpen` e retorna à lista sem salvar.
- Após cadastro confirmado, o fluxo homologado do BUG-002 fecha o estado, limpa o formulário, atualiza quando possível e renderiza a lista.
- A edição permanece no comportamento anterior, junto à lista, reutilizando o mesmo markup de campos.

## Filtros compactos

- Busca permanece sempre visível.
- `userFiltersOpen` inicia como `false`.
- O botão `Filtros` abre e fecha Status, Período e Data de vencimento.
- Filtros avançados ativos são indicados por contador no botão mesmo quando recolhidos.
- `resetUserFilters()` também recolhe a área avançada.
- A função `filteredUsers()` e seus critérios não foram alterados.

## Responsividade

- Mobile: busca flexível e botão compacto na mesma linha; avançados em duas colunas, com data abaixo.
- A partir de 700 px: Status, Período, Data e limpeza aproveitam uma linha ampla.
- Campos usam `min-width: 0` para impedir overflow horizontal.

## Escopo preservado

Persistência remota, BUG-002, renovação/BUG-005, login/BUG-006, Auth, EC-18, banco, RLS, policies e produção não foram funcionalmente alterados.
