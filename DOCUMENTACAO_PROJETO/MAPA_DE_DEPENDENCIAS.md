# MAPA DE DEPENDÊNCIAS

## Trilha principal de segurança

```text
Fase 1 / Baseline Oficial
  ↓
Fundação auth_user_id em homologação
  ↓
Piloto Auth (1 usuário não-Master)
  ↓
EC-10 — separação Master Global / Minha Conta [homologada]
  ↓
EC-12/13/14/15 — cache, sessão, cargas e estabilidade [homologadas]
  ↓
EC-17 — versionamento determinístico / PWA [homologada]
  ↓
EC-18.1 — troca de senha legacy específica [implementada]
  ↓
EC-18.2 — persistDatabase sem usuários [implementada]
  ↓
EC-18.3 — remoção da ferramenta temporária de parcelas [implementada]
  ↓
EC-18.4 — APR de retirada de password dos loaders [APR]
  ↓
EC-18.5 — campos públicos + loadUserById [implementada]
  ↓
EC-18.6 — login legacy com projeção pública [implementada]
  ↓
EC-18.7 — Master com projeção pública [implementada]
  ↓
EC-18.8.1 — fromSupabaseRows sem password [implementada]
  ↓
EC-18.8.2 — toSupabaseRows sem usuarios/senha [implementada]
  ↓
EC-18.9 — loadPersonalDatabase público; remove userToSupabaseLike [implementada]
  ↓
EC-18.10 — APR de normalizeDatabase/seed [APR concluída]
  ↓
EC-18.10.1 — remover fallback e passwords do seed [implementada]
  ↓
segunda auditoria documental independente [checkpoint planejado]
  ↓
EC-18.10.2 — cadastro/autocadastro sem password no perfil local [implementada]
  ↓
EC-18.10.3 — edição Master sem atribuição runtime de password [implementada]
  ↓
validação final de db.users/cache/fila/sessão [categoria H = zero]
  ↓
BUG-002 — cadastro Master com reconciliação e estados parciais [implementado/testado estruturalmente]
  ↓
migração gradual dos 5 usuários legacy restantes
  ↓
APR e policies RLS em homologação
  ↓
testes multiusuário e anti-impersonação
  ↓
plano controlado de produção
```

## Dependências e checkpoints recomendados

| Próxima área | Condição recomendada ou técnica |
|---|---|
| Segunda auditoria documental | Checkpoint planejado sobre o pacote atualizado; pode ser reordenado ou dispensado pelo proprietário |
| EC-18.10.2 | Implementada tecnicamente; aguarda validação/homologação |
| Cadastro/autocadastro | Perfil e credencial separados; preservar regressão do login legacy |
| Edição Master | Materialização runtime removida; preservar PATCH específico |
| Migração dos demais usuários | Runtime sem credenciais e plano por usuário |
| RLS | Perfis Auth vinculados e consultas compatíveis com `auth.uid()` |
| Produção | Homologação completa é o fluxo recomendado; backup, rollback, avaliação de risco e autorização expressa são controles técnicos essenciais |

## Dependências dos bugs funcionais

```text
Fundação de segurança estável
  ├─ BUG-002 Master: homologado pelo proprietário
  ├─ BUG-005 renovação Master: homologado pelo proprietário
  ├─ BUG-001 recorrência: homologado pelo proprietário
  ├─ BUG-003 cartões: homologado pelo proprietário
  ├─ BUG-007 parcelas: homologado pelo proprietário
  ├─ UX Compras do Cartão: filtro Pendentes/Pagos/por mês homologado pelo proprietário
  ├─ BUG-006 login bloqueado: homologado pelo proprietário
  └─ BUG-004 notificações: APR/precheck concluído; não implementado
```

Próximo ponto oficial: novo teste manual do BUG-006 no servidor 4178. BUG-003, BUG-007 e a UX do filtro estão homologados; BUG-004 não deve ser iniciado automaticamente. Conforme DEC-019, prioridades futuras serão definidas pelo proprietário, preservadas as dependências técnicas concretas.
