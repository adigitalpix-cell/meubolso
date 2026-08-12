# DECISÕES OFICIAIS CRÍTICAS

Os identificadores abaixo foram criados para tornar as decisões expressas pelo proprietário rastreáveis. Eles não substituem migrations nem commits.

| ID | Decisão |
|---|---|
| DEC-001 | Produção `hdldbvexlxsbboaxwrut` não pode ser alterada sem autorização explícita de produção. |
| DEC-002 | Alterações de segurança e Auth são preparadas e validadas primeiro na homologação `ncgfwatsciwzzhqlspvy`. |
| DEC-003 | `public.usuarios.id` é o UUID financeiro e não pode ser substituído ou alterado pela migração Auth. |
| DEC-004 | `auth.users.id` deve ser ligado por `public.usuarios.auth_user_id`; o vínculo é gradual. |
| DEC-005 | Usuários, acessos, históricos e dados financeiros existentes devem ser preservados sem recriação manual. |
| DEC-006 | Login legacy permanece funcional até o fim da migração; senhas legacy não podem ser apagadas antecipadamente. |
| DEC-007 | Autocadastro público e cadastro de usuário pelo Master Global devem continuar disponíveis. |
| DEC-008 | `service_role`, Secret Key, senha, JWT e tokens nunca entram no navegador, Git, logs ou documentação. |
| DEC-009 | RLS/policies não devem ser ativadas antes de Auth e todos os fluxos necessários estarem preparados e testados. |
| DEC-010 | O fluxo padrão recomendado para uma EC é: APR → implementação autorizada → validação → homologação. O proprietário pode ajustar essa sequência. |
| DEC-011 | Implementado, testado, homologado, commitado e publicado são estados diferentes e devem ser reportados separadamente. |
| DEC-012 | Como padrão de redução de risco, manter correções dos bugs financeiros separadas da migração de segurança, salvo escopo combinado expressamente autorizado e tecnicamente seguro. |
| DEC-013 | Recorrência mensal editada altera a ocorrência atual e futuras, preserva anteriores e não cria série paralela. |
| DEC-014 | Cartão que fecha no dia D inclui compra feita até D na fatura atual e compra após D na seguinte; vencimento vem do cartão. |
| DEC-015 | Parcela/fatura paga permanece paga e não pode ser recriada, duplicada ou voltar a pendente. |
| DEC-016 | Notificação de cartão usa fechamento e vencimento da fatura, não a data individual da compra como regra principal. |
| DEC-017 | Cópia da homologação é fiel no escopo do schema `public`; objetos internos gerenciados pelo Supabase não devem ser removidos ou assumidos. |
| DEC-018 | Nenhuma inconsistência histórica da baseline deve ser apagada ou corrigida sem plano de migração, backup, teste e autorização. |
| DEC-019 | Documentação, APRs, auditorias, matrizes, gates e checklists orientam e protegem o projeto, mas não constituem bloqueio absoluto. Autorização expressa do proprietário da Alex Digital pode alterar prioridade, dispensar etapa documental ou autorizar avanço direto, desde que tecnicamente possível e preservados segurança, integridade dos dados e escopo autorizado. |
| DEC-020 | O servidor local oficial único do MEU BOLSO é `http://127.0.0.1:4178/`, sempre servindo `C:\Projetos\meubolso`. Testes não usam `file://` nem criam nova porta por rodada; query strings identificam o teste, não a versão do código. Exceções exigem necessidade técnica comprovada, explicação e retorno posterior à porta 4178. |
| DEC-021 | O método operacional oficial está centralizado em `METODO_OFICIAL_DE_TRABALHO.md`: ChatGPT coordena e analisa, o proprietário decide e homologa, e o Codex executa tecnicamente. O fluxo é eficiente, proporcional ao risco e não bloqueante; pode ser abreviado ou reordenado pelo proprietário, preservados segurança, integridade, credenciais, produção e escopo autorizado. |

## Servidor local único

Antes de qualquer teste manual ou automatizado, confirmar que o servidor oficial `127.0.0.1:4178` está servindo o worktree atual.

- Codex e proprietário usam a mesma origem: `http://127.0.0.1:4178/`.
- A pasta obrigatória é `C:\Projetos\meubolso`.
- `C:/Projetos/meubolso/index.html` aberto por `file://` não é um teste válido.
- Query strings como `?users-ux=1`, `?master-write-sync=1` e `?bug002-post-confirm=1` são identificadores históricos e não selecionam bundle.
- O bundle executado é definido pelo `index.html`, `app.js` e `sw.js` atuais do worktree.
- Não limpar automaticamente localStorage, sessão, banco local ou dados de teste. Cache antigo só deve ser removido quando necessário e após avaliação do estado útil.

## Governança não bloqueante

A documentação, APRs, auditorias, matrizes, gates e checklists do MEU BOLSO servem para preservar contexto, orientar decisões, registrar riscos e reduzir regressões. Não constituem bloqueio absoluto à evolução do projeto.

Uma autorização expressa do proprietário da Alex Digital pode alterar prioridades, dispensar uma etapa documental ou autorizar avanço direto, desde que a execução seja tecnicamente possível e preserve segurança, integridade dos dados e o escopo autorizado.

Riscos técnicos concretos devem ser informados objetivamente e tratados da forma mais segura possível. A documentação deve facilitar e registrar a execução autorizada, e não impedir o avanço.

## Bugs oficiais e estado de correção

- BUG-001: edição de recorrência pode manter a série antiga e criar nova ocorrência/série.
- BUG-002: cadastro pelo Master pode mostrar sucesso e falha sem persistir corretamente.
- BUG-003: resumo e detalhe de cartões podem aplicar filtros diferentes e ocultar compra/parcela.
- BUG-004: notificação de cartão pode usar data de compra/parcela em vez de fechamento/vencimento.
- BUG-005: renovação pelo Master pode concluir escrita parcial ou confundir falha de refresh com falha de persistência.
- BUG-006: homologado pelo proprietário após bloqueio, ausência de sessão e mensagem exata confirmados manualmente.
- BUG-007: compra parcelada com pagamento inicial precisa distinguir quantas parcelas já foram pagas.

BUG-001, BUG-002, BUG-003, BUG-005, BUG-006 e BUG-007 foram homologados pelo proprietário. BUG-004 possui APR/precheck concluído, mas permanece não implementado e não homologado. A homologação decorre dos testes manuais declarados, não apenas das ECs de segurança.
