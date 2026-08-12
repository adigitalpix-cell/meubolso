# Release 0.68.2

Data: 12/08/2026.

Commit: commit único com a mensagem `release: publish v0.68.2 with bug-008 bug-009 bug-010`.

## Escopo

- BUG-008 — cronograma retroativo e Prévia das parcelas: homologado e incluído;
- BUG-009 — recorrência de receitas: homologado e incluído;
- BUG-010 — rascunhos de Receita, Despesa e Compra: homologado e incluído.

## Versionamento

- versão do aplicativo: `0.68.2`;
- recurso: `/app.js?v=0.68.2`;
- cache PWA: `meu-bolso-v0.68.2`;
- service worker mantém network-first e remove caches antigos durante a ativação.

## Segurança e dados

O deploy não altera banco, schema, Auth, RLS ou policies. A configuração pública permanece no projeto de produção `hdldbvexlxsbboaxwrut`, com login dual e campos opcionais de endereço desativados. Nenhum segredo integra a release.

## Atualização do PWA

Dados e rascunhos locais são preservados. Uma PWA já aberta pode precisar ser fechada e aberta uma vez para assumir o novo service worker; não deve ser necessária limpeza manual de cache.
