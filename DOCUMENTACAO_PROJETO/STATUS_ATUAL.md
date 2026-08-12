# STATUS ATUAL

## Identificação

| Item | Estado |
|---|---|
| Data | 2026-08-12 |
| Pasta | `C:\Projetos\meubolso` |
| Branch | `develop` |
| HEAD atual (`develop` e `main`) | commit único da release `0.68.3` |
| Release em produção | `0.68.3` |
| Recurso JavaScript | `/app.js?v=0.68.3` |
| Cache PWA | `meu-bolso-v0.68.3` |
| Runtime publicado | Produção `hdldbvexlxsbboaxwrut` |
| URL de produção | `https://meubolso2.vercel.app` |

## Arquitetura resumida

- PWA estático sem etapa de build obrigatória.
- UI e regras concentradas em `app.js` e `styles.css`.
- Persistência via Supabase REST.
- Supabase Auth introduzido em modo dual e gradual.
- Sessão da aplicação guarda IDs/modo/contexto, não deve guardar senha.
- Cache offline e fila local são sanitizados contra credenciais.
- Dados financeiros são vinculados por `usuario_id = public.usuarios.id`.

## Banco homologado na baseline

Tabelas públicas: `usuarios`, `receitas`, `despesas`, `cartoes`, `compras_cartao`, `parcelas`, `categorias`, `tipos_conta`, `suporte`, `renovacoes`.

Estado da baseline:

- usuários: 6;
- receitas: 36;
- despesas: 222;
- cartões: 12;
- compras: 15;
- parcelas: 88;
- categorias: 52;
- tipos de conta: 32;
- suporte: 0;
- renovações: 2;
- RLS: 0 tabelas;
- policies: 0.

Essas contagens são da baseline de 2026-08-08, não uma consulta em tempo real.

## Auth gradual

- `public.usuarios.id` permanece o UUID financeiro.
- `public.usuarios.auth_user_id` referencia `auth.users.id`.
- Leitura de 12/08/2026: 1 piloto Auth e 7 usuários legacy na homologação.
- O piloto foi autenticado e vinculado sem mudar seu UUID financeiro.
- Login dual está habilitado somente no runtime de homologação.
- RLS permanece não iniciada; sua ativação exige desenho compatível para evitar bloqueio ou exposição de usuários.

## Estado do código de segurança

- REST timeout: 15 segundos.
- Projeção pública: `PUBLIC_USER_FIELDS` sem `senha`.
- Loaders públicos e Master usam projeção pública.
- Login legacy valida senha transitoriamente no filtro REST.
- Login Auth usa Supabase Auth.
- Cache e fila offline removem/bloqueiam credenciais.
- `persistDatabase()` não persiste usuários.
- `fromSupabaseRows()` não gera `password`.
- `toSupabaseRows()` não gera `usuarios` nem `senha`.
- `loadPersonalDatabase()` não usa mais conversão para linha Supabase.
- `normalizeDatabase()` não cria nem recria credenciais.
- Seed runtime não contém campos de senha.
- Autocadastro e criação pelo Master mantêm senha somente em variável transitória e payload online-only.
- Edição Master preserva o PATCH legacy específico sem atribuir a senha ao objeto runtime.
- Validação final encontrou categoria H (materialização indevida em objeto runtime) igual a zero.
- BUG-002 separa criação crítica de inicializações secundárias, reconcilia timeout pós-POST e impede que refresh invalide cadastro confirmado.
- BUG-002 foi homologado pelo proprietário: criação, mensagem, fechamento, retorno à lista e ausência de duplicidade confirmados.
- A área Usuários Master agora abre Novo usuário em tela exclusiva e mantém filtros avançados recolhidos por padrão, sem alterar `filteredUsers()` nem a persistência.
- BUG-002 foi reproduzido manualmente após a correção porque o runtime carregou bundle antigo e a projeção de usuários era incompatível com o schema da homologação.
- BUG-005 foi homologado pelo proprietário após teste manual da renovação.
- BUG-006 foi homologado pelo proprietário após novo teste manual: acesso bloqueado, nenhuma sessão criada e mensagem específica presente no DOM.
- Homologação desabilita explicitamente os campos opcionais `endereco`, `cidade` e `estado`, inexistentes nesse ambiente; produção não foi alterada.
- Service worker passou a network-first com fallback offline para impedir bundle antigo quando há rede.
- BUG-001 agora usa identidade estável de série em `despesas.origem`, UUID determinístico por competência e edição da ocorrência atual/futuras; testes estruturais e homologação manual foram aprovados.
- O residual de exclusão legacy foi reproduzido e corrigido com marcador persistente `manual-recurring-ended:`. Passado e pagamentos permanecem intactos; atual/futuro são encerrados e ocultos.
- BUG-001 foi homologado pelo proprietário no servidor oficial 4178: criação, edição, exclusão e ausência de reaparecimento após refresh foram confirmadas.
- BUG-003 foi reproduzido: resumo usava o mês corrente e detalhe avançava para o mês do próximo fechamento. A primeira correção unificou a competência e passou em 20/20 testes estruturais.
- Três compras reais do Nubank foram localizadas por leitura. Todas começavam em setembro, enquanto `cardInvoiceItems()` usava agosto como alvo padrão; esse era o primeiro descarte de pagas e pendente. `cardInvoiceTargetMonth()` agora deriva o mês pelo fechamento do cartão e resumo/detalhe usam o mesmo alvo.
- BUG-007 foi reproduzido: `saveCardPurchase()` atribuía `allInstallmentKeys()` ao status Pago. O formulário agora coleta `Parcelas já pagas`, valida 0 até o total e gera status individual. Treze testes conjuntos passaram; BUG-003 e BUG-007 foram homologados pelo proprietário.
- A tela Compras do Cartão recebeu filtro visual compacto: Pendentes por padrão, Pagos por quitação total e consulta por competência. O total pendente e as coleções do BUG-003 foram preservados; 18/18 testes passaram.
- A UX do filtro de Compras do Cartão foi homologada pelo proprietário no servidor oficial 4178: Pendentes, Pagos, competência mensal, classificação de compra parcialmente paga, parcela paga visível em compra ainda pendente, total e visual foram aprovados. O estado formal de BUG-003/007 não foi alterado por esta homologação.
- BUG-008 foi reproduzido, corrigido e homologado pelo proprietário: parcelas já pagas recuam a partir da competência oficial, usam o vencimento real do cartão e compartilham o mesmo cronograma entre prévia e persistência. Os cenários com vencimentos nos dias 07 e 21 e os estados PAGO/FATURA ATUAL/PRÓXIMA/PENDENTE foram aprovados.
- BUG-009 foi reproduzido, corrigido e homologado pelo proprietário: receitas mensais possuem identidade estável, edição/exclusão afetam somente a competência atual e futuras, o encerramento persiste em `receitas.recorrencia`, refresh/reload preservam o estado e o histórico anterior permanece intacto.
- BUG-010 foi reproduzido e implementado localmente: Nova Receita, Nova Despesa e Nova Compra usam rascunho automático em `localStorage`, isolado pelo UUID financeiro e pelo tipo de formulário. Fechar, navegar, atualizar ou reabrir preserva; sucesso limpa; falha e cancelamento simples preservam; descarte explícito limpa após confirmação. Passou em 20/20 testes estruturais e aguarda homologação manual.
- BUG-011 foi reproduzido, corrigido e homologado pelo proprietário: competência, vencimento e fechamento usam o mesmo ciclo; 21 verificações principais passaram. A correção integra a release `0.68.3`.
- O residual 2 do BUG-011 refinou a visibilidade por estado + saldo + itens: faturas vencidas ou atuais com pendência e itens mantêm ações; futuras mostram somente valor/status/menu; cartões zerados não mostram expansão vazia. O menu ⋮ permanece à direita em todos os estados. Quinze verificações adicionais passaram.

## Git e produção

- Release `0.68.1` concluída no commit `3bab0ff1afaadadd0cece225f57a42b3a429c485`.
- Push concluído; `develop` e `main` ficaram sincronizadas nesse commit.
- Deploy Vercel concluído em `https://meubolso2.vercel.app`.
- A produção serve `/app.js?v=0.68.1` e usa o cache `meu-bolso-v0.68.1`.
- O worktree ficou limpo após a release.
- BUG-001 a BUG-007 integram a release homologada.
- Dados dos usuários foram preservados; banco, Auth, RLS e policies não foram alterados durante o deploy.
- A migration `auth_user_id` foi aplicada anteriormente em produção e não pertenceu ao deploy da release.

## Estado das fases

| Fase/etapa | Estado |
|---|---|
| Fase 1 — Auditoria, contenção e preparação | Concluída |
| Etapa 1 — Auditoria visual e funcional | Concluída |
| Etapa 2 — Auditoria técnica e produção | Concluída |
| Etapa 3 — Backup e homologação | Concluída |
| Etapa 4 — Restauração, comparação e baseline | Concluída |
| Fase 2 — Segurança e Fundação | Em andamento |
| Migração gradual Auth | Em andamento somente em homologação |
| Remoção de credenciais do runtime | Em andamento |
| RLS/policies | Não iniciada |

## Checkpoints e condições atuais

- EC-18.10.3 está implementada tecnicamente e ainda não homologada pelo proprietário.
- O bloco EC-18 pode ser considerado tecnicamente concluído no objetivo de zero credenciais em runtime.
- BUG-001 a BUG-007 permanecem homologados e publicados.
- BUG-008, BUG-009 e BUG-010 estão homologados e integram a release `0.68.2`.
- Release `0.68.2` consolida BUG-008, BUG-009 e BUG-010 homologados; versionamento de app, recurso e cache PWA foi atualizado de forma determinística.
- BUG-004 foi homologado pelo proprietário em 12/08/2026. Nubank apareceu uma única vez como fatura vencida e com R$ 262,50 nas duas telas; Caixa permaneceu como fatura fechada em R$ 62,50, vencendo em 17/08/2026. Competência, total atual e ausência de estado histórico concorrente foram aprovados.
- UX filtro Compras do Cartão: HOMOLOGADA PELO PROPRIETÁRIO.
- BUG-011 e seus dois residuais foram homologados e publicados na release `0.68.3`.
- RLS não pode ser ativada enquanto os fluxos não estiverem prontos.
- Como padrão, correções financeiras devem permanecer separadas da fundação de segurança; o proprietário pode alterar a prioridade e autorizar escopo combinado se tecnicamente seguro.

## Divergências de schema e segurança

- `schema.sql` e `supabase/schema.sql` são snapshots históricos e não contêm a fundação `auth_user_id`; essa evolução está na migration separada de Auth.
- Os dois schemas históricos contêm uma credencial bootstrap Master fixa. O valor não deve ser exposto nem reutilizado. O risco é crítico e permanece sem correção nesta auditoria.

## Compatibilidade de schema da release publicada

- Produção (`hdldbvexlxsbboaxwrut`) possui 6 usuários financeiros, 0 usuários Auth e agora possui `public.usuarios.auth_user_id uuid NULL`.
- Homologação (`ncgfwatsciwzzhqlspvy`) possui a coluna `uuid`, nullable, sem default, com 8 usuários financeiros: 1 vinculado e 7 Legacy.
- A migration mínima foi aplicada e validada: 6 valores NULL, UUIDs financeiros preservados, RLS desativada e 0 policies.
- A auditoria dos 14 campos confirmou schemas iguais. `endereco`, `cidade` e `estado` não existem nos dois ambientes e são opcionais no código.
- A projeção efetiva de 11 campos e o filtro Legacy funcionam em produção sem `42703`.
- A configuração local de produção foi preparada e validada com `authDualLoginEnabled: false` e `userProfileAddressFieldsEnabled: false`.
- A tela de login e a consulta real de usuário inexistente carregaram contra produção sem `42703`; nenhum login real foi executado.
- Release `0.68.1` publicada após staging e validações finais; o schema compatível foi preservado sem escrita de banco durante o deploy.
- Referência detalhada: `COMPATIBILIDADE_SCHEMA_AUTH_USER_ID_PRODUCAO.md`.
- Auditoria completa: `COMPATIBILIDADE_PUBLIC_USER_FIELDS_PRODUCAO.md`.
