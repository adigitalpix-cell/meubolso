# RELATÓRIO UX USUÁRIOS MASTER — 2026-08-11

## Status

- BUG-002: homologado pelo proprietário.
- Tela exclusiva Novo usuário: implementada e testada estruturalmente.
- Filtros avançados recolhíveis: implementados e testados estruturalmente.
- Teste manual visual do proprietário: pendente.

## Implementação

- `userFormTemplate()` centraliza o formulário existente.
- Criação retorna uma tela exclusiva; edição permanece junto à lista.
- `userFiltersOpen` controla somente a apresentação dos filtros avançados.
- Busca permanece visível e `filteredUsers()` não foi alterada.
- Badge informa a quantidade de filtros avançados ativos.
- Bundle `/app.js?v=0.68.0-users-ux` e cache `meu-bolso-v0.68.0-users-ux`.

## Regressão

BUG-002, BUG-005, BUG-006, EC-18, renovação, edição, Auth, banco, RLS, policies e produção foram preservados. BUG-001, BUG-003 e BUG-004 continuam pendentes.
