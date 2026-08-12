# CHECKLIST PARA NOVA CONVERSA

Antes de propor ou executar qualquer alteração:

- [ ] identifiquei o pacote de código fornecido;
- [ ] confirmei se o pacote e o worktree correspondem à documentação;
- [ ] li `00_INICIAR_NOVA_CONVERSA.md`;
- [ ] li `HANDOFF_ATUAL.md`;
- [ ] li `STATUS_ATUAL.md`;
- [ ] li `PROXIMA_RETOMADA.md`;
- [ ] li os demais arquivos de `DOCUMENTACAO_PROJETO`;
- [ ] li o Relatório Oficial do Dia mais recente;
- [ ] li a auditoria documental mais recente e sua matriz oficial de ECs;
- [ ] comparei código e documentação;
- [ ] conferi pasta, branch, HEAD e `git status`;
- [ ] confirmei que `http://127.0.0.1:4178/` serve exatamente `C:\Projetos\meubolso`;
- [ ] confirmei que o teste usa HTTP local e não `file://`;
- [ ] comparei o bundle e os arquivos servidos com o worktree atual;
- [ ] conferi o Project Ref do ambiente;
- [ ] confirmei que produção não é destino;
- [ ] conferi a EC atual e seu escopo;
- [ ] conferi as DEC aplicáveis;
- [ ] conferi riscos, dependências e checkpoints;
- [ ] ainda não alterei nada;
- [ ] sei exatamente qual é a próxima ação;
- [ ] recebi autorização expressa para essa ação.

Este checklist é o fluxo padrão recomendado. Ele pode ser abreviado ou reordenado por autorização expressa do proprietário, desde que o escopo seja claro e os riscos técnicos relevantes sejam informados e tratados.

## Checklist de segurança permanente

- [ ] não exibi senha, token, JWT ou chave;
- [ ] não registrei `service_role`/Secret Key;
- [ ] não alterei produção;
- [ ] não alterei UUID financeiro;
- [ ] não ativei RLS prematuramente;
- [ ] não misturei bugs financeiros e fundação de segurança;
- [ ] preservei alterações locais acumuladas;
- [ ] distingui teste técnico, E2E e homologação.
- [ ] tratei contagens de Auth/banco documentadas como evidência histórica, não como consulta em tempo real.

Não limpar automaticamente localStorage, sessão, banco local ou dados de teste ao preparar a origem oficial. Query strings antigas são apenas identificadores históricos.
