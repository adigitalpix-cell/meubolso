# Release 0.68.3

Data: 12/08/2026.

Commit: commit único com a mensagem `release: publish v0.68.3 with bug-011`.

## Escopo

- BUG-011 — competência e vencimento da fatura ativa;
- residual 1 — ações e lista ocultas para fatura futura;
- residual 2 — ações preservadas para fatura vencida/atual, cartão zerado sem expansão e menu ⋮ alinhado à direita.

O proprietário homologou os cenários Nubank, Caixa, Neon e Mercado Pago. BUG-003, BUG-004, BUG-008, BUG-009 e BUG-010 permanecem preservados.

## Versionamento

- aplicativo e manifesto: `0.68.3`;
- recurso: `/app.js?v=0.68.3`;
- cache PWA: `meu-bolso-v0.68.3`;
- service worker mantém network-first inline, `skipWaiting()`, `clients.claim()`, fallback offline e remoção de caches antigos.

## Segurança e dados

A release não altera banco, schema, migrations, Auth, RLS ou policies. Nenhum segredo, dump, backup, mock ou arquivo temporário integra o commit. Dados financeiros e rascunhos locais são preservados.
