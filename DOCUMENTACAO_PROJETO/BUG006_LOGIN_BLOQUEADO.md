# BUG-006 — LOGIN DE USUÁRIO BLOQUEADO SEM MENSAGEM ESPECÍFICA

## Estado

**HOMOLOGADO PELO PROPRIETÁRIO.**

## Sintoma

O teste manual do proprietário reprovou a implementação anterior: credenciais válidas de um usuário administrativamente bloqueado não exibiam a mensagem específica, embora o acesso fosse impedido.

## Causa

O modelo remoto estava correto: `usuarios.status = "bloqueado"` era convertido por `fromSupabaseRows()` em `user.blocked = true`, e `accessRestrictionMessage()` priorizava o bloqueio administrativo. A falha residual estava no DOM: `bindLogin()` voltava a consultar `event.currentTarget` depois de `await`. Encerrado o despacho do evento, `currentTarget` passa a `null`; a tentativa de inserir o alerta falhava antes de a mensagem alcançar o formulário.

Leitura não destrutiva da homologação confirmou um único usuário bloqueado, no fluxo Legacy, sem vínculo Auth e sem vencimento simultâneo. Nenhum dado foi alterado.

## Correção

- `accessRestrictionMessage()` diferencia bloqueio explícito, vencimento e fallback não autorizado.
- O formulário de login é capturado em variável local antes da primeira operação assíncrona e reutilizado após a validação.
- O alerta anterior é removido antes de inserir a mensagem atual, impedindo duplicação visual.
- O bloqueio continua anterior à criação da sessão e à carga financeira.
- Para Auth, a sessão Supabase autenticada é encerrada e o estado local é limpo antes da mensagem.
- Usuário inexistente, senha incorreta e erro de conexão mantêm as mensagens anteriores.

## Testes estruturais

| Cenário | Resultado |
|---|---|
| Legacy ativo + senha correta | login preservado |
| Legacy bloqueado + senha correta | sem sessão; mensagem específica de bloqueio |
| Legacy bloqueado + senha errada | mensagem genérica; bloqueio não revelado |
| Usuário inexistente | mensagem genérica |
| Usuário vencido | mensagem própria de expiração |
| Auth ativo | login preservado |
| Auth bloqueado no perfil | sign-out, sem sessão e mensagem específica |
| Erro de rede | mensagem de conexão |
| Auth bloqueado sem sessão financeira | nenhuma carga ou sessão financeira |
| Logout/limpeza após Auth bloqueado | sign-out e estado local limpo |

Resultado: 10/10 cenários aprovados com a função real `bindLogin()` e comportamento assíncrono realista de `event.currentTarget`.

Bundle: `/app.js?v=0.68.0-bug006-login-alert`. Cache: `meu-bolso-v0.68.0-bug006-login-alert`.

Nenhum banco, Auth, RLS, policy ou ambiente de produção foi alterado.

## Homologação manual

Em 2026-08-11, o proprietário testou novamente no servidor oficial 4178 um usuário administrativamente bloqueado. O login foi impedido, nenhuma sessão foi criada e o DOM exibiu exatamente: “Seu acesso está bloqueado. Entre em contato com o administrador.” O BUG-006 está formalmente homologado.
