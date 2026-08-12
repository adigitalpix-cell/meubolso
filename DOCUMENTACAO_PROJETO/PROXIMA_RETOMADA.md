# PRÓXIMA RETOMADA

## Ponto atual

A release `0.68.3` publica o BUG-011 e seus dois residuais homologados, preservando BUG-003, BUG-004, BUG-008, BUG-009 e BUG-010. O recurso é `/app.js?v=0.68.3` e o cache é `meu-bolso-v0.68.3`.

A release `0.68.1` está publicada em produção no commit `3bab0ff1afaadadd0cece225f57a42b3a429c485`. `develop` e `main` estão sincronizadas, o deploy Vercel foi concluído e a produção serve `/app.js?v=0.68.1` com cache `meu-bolso-v0.68.1`.

Após a release, o BUG-008 foi implementado localmente, testado estruturalmente e homologado pelo proprietário. O cronograma retroativo, os vencimentos nos dias 07 e 21, a competência atual, os estados e a prévia discreta foram aprovados. As alterações ainda não foram commitadas, enviadas ou publicadas.

O BUG-009 foi implementado localmente, passou em 20/20 testes estruturais e foi homologado pelo proprietário. Mensal → Não repete, edição/exclusão atual+futuras, refresh/reload, ausência de reaparecimento, histórico anterior e tipo de repetição no card foram aprovados.

O BUG-010 foi homologado pelo proprietário para Nova Receita, Nova Despesa e Nova Compra. Navegação, refresh, restauração, campos dinâmicos, Prévia, descarte, salvamento e isolamento entre usuários foram aprovados.

EC-18.10.3 removeu a última atribuição runtime conhecida de senha. A validação final encontrou categoria H — materialização indevida de credencial em objeto runtime — igual a zero.

O bloco EC-18 está tecnicamente concluído nesse objetivo. Essa conclusão é estrutural e isolada; não equivale a E2E real nem homologação das EC-18.x.

BUG-001, BUG-002, BUG-003, BUG-005, BUG-006 e BUG-007 foram homologados pelo proprietário. A nova UX de Usuários Master ainda aguarda teste manual.

## Próximo bloco recomendado

### 1. Teste manual da nova UX de Usuários Master

Validar em homologação:

- criação completa com uma única mensagem de sucesso;
- usuário visível após refresh;
- login legacy preservado;
- ausência de senha no perfil local/cache;
- comportamento normal de Master Global e Minha Conta.
- renovação de usuário de teste com validade e histórico confirmados;
- ausência da tela “Não foi possível conectar” após refresh.

### 2. BUG-004 — homologado

Homologado pelo proprietário em 12/08/2026. Nubank apareceu uma única vez como `Fatura vencida`, com R$ 262,50 iguais a Meus Cartões. Caixa permaneceu como `Fatura fechada`, R$ 62,50, vencimento em 17/08/2026. Competência atual e ausência de estado histórico concorrente foram aprovadas.

## Estado que deve ser preservado

- BUG-001, BUG-003, BUG-004 e BUG-007 estão homologados pelo proprietário.
- BUG-002 está homologado pelo proprietário.
- BUG-005 está homologado pelo proprietário.
- BUG-006 está homologado pelo proprietário.
- Login legacy e Auth permanecem funcionais no desenho atual.
- `db.users`, cache, fila e sessão permanecem sem senha.
- Produção está na release homologada `0.68.2`; o deploy não escreveu no banco e preservou dados, Auth, RLS e policies.
- RLS/policies continuam ausentes.

## Próxima ação exata

O proprietário deve revisar a release `0.68.3` em produção e escolher a próxima frente do projeto. Não iniciar BUG-012 nem outra implementação automaticamente.

O PWA usa network-first e remove caches antigos na ativação. Se já estiver aberto, o usuário pode precisar fechá-lo e abri-lo uma vez; não deve ser necessária limpeza manual de cache.
