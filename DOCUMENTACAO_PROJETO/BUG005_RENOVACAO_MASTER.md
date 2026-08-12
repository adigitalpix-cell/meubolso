# BUG-005 — RENOVAÇÃO MASTER NÃO SINCRONIZA

## Estado

**HOMOLOGADO PELO PROPRIETÁRIO.** A renovação foi confirmada funcionando no teste manual do runtime de homologação.

## Causa comum comprovada

A projeção pública de `usuarios` solicitava `endereco`, `cidade` e `estado`, colunas ausentes na homologação. O refresh Master recebia HTTP 400 / PostgreSQL `42703`. No bundle antigo, `saveDatabase()` engolia a exceção, gravava `lastSyncError` e produzia a sequência “Não foi possível sincronizar com o Supabase” → “Não foi possível conectar”.

## Defeito específico comprovado

`renewUser()` também misturava no mesmo `try`:

```text
PATCH usuarios → POST renovacoes → refreshMasterData
```

O estado local era alterado antes da primeira escrita. Falha pré-escrita, timeout pós-escrita, histórico parcial e falha exclusiva de refresh produziam o mesmo erro genérico.

## Correção

- PATCH de validade é a etapa crítica e pode ser reconciliada por `loadUserById()`.
- Histórico usa UUID fixo da tentativa e é reconciliado por `loadRenewalById()`.
- `saveRenewalToSupabase()` exige conexão e usa `queueOffline: false`; fila genérica financeira não foi alterada.
- Falha definitiva antes do PATCH não altera o estado local.
- Validade atualizada com falha de histórico é informada como estado parcial.
- Falha de refresh não invalida escritas confirmadas.
- Não há retry automático nem fila offline para essas escritas.
- Respostas `204`/vazias continuam sendo sucesso válido.

## Evidências

Stubs aprovaram: sucesso, erro HTTP no PATCH, timeout antes/depois do PATCH, erro HTTP no histórico, timeout antes/depois do histórico e falha de refresh após as duas escritas.

Nenhum usuário real foi renovado durante o diagnóstico. Banco, Auth, RLS, policies e produção não foram alterados.

## Riscos residuais

- Se a validade for confirmada e o histórico falhar, o estado remoto fica parcialmente concluído; a mensagem diferencia esse caso.
- A homologação ainda não possui os três campos opcionais de endereço; eles ficam desabilitados apenas nesse ambiente por configuração explícita.
- A correção foi homologada manualmente pelo proprietário.
