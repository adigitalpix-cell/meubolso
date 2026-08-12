# HANDOFF ATUAL

Atualizado em: 2026-08-12.

## Onde estamos?

Fase 2 — Segurança e Fundação. A trilha atual remove credenciais de `db.users` e dos fluxos públicos sem interromper a migração gradual legacy → Supabase Auth.

Método operacional oficial: `METODO_OFICIAL_DE_TRABALHO.md`. Ele estabelece responsabilidades, precheck curto, implementação mínima, testes proporcionais, homologação pelo proprietário e encerramento com direção clara, preservando a governança não bloqueante.

Servidor local oficial permanente: `http://127.0.0.1:4178/`, servindo `C:\Projetos\meubolso`. Não usar `file://` nem criar nova porta por rodada. Antes de testar, comprovar que os arquivos HTTP correspondem ao worktree atual, preservando localStorage, sessão e cache útil.

## Estado da release 0.68.2

- BUG-008, BUG-009 e BUG-010 homologados integram a release `0.68.2`.
- Recurso: `/app.js?v=0.68.2`.
- Cache PWA: `meu-bolso-v0.68.2`.
- Banco, Auth, RLS e policies permanecem inalterados pela release.

## Histórico da release 0.68.1

- Commit final: `3bab0ff1afaadadd0cece225f57a42b3a429c485`.
- Push concluído; `develop` e `main` sincronizadas.
- Deploy Vercel concluído em `https://meubolso2.vercel.app`.
- Produção servindo `/app.js?v=0.68.1` com cache `meu-bolso-v0.68.1`.
- BUG-001 a BUG-007 incluídos na release homologada.
- Worktree limpo após a publicação.
- Dados dos usuários preservados; banco, Auth, RLS e policies não foram alterados durante a release.
- A migration `auth_user_id` ocorreu antes da release e não fez parte do deploy.

## O que acabou de ser feito?

Diagnóstico runtime conjunto do BUG-002 e BUG-005 concluído:

- homologação comprovou ausência de `usuarios.endereco`, `cidade` e `estado`;
- projeção pública incompatível causava HTTP 400/`42703` em login, preflight e refresh Master;
- teste manual do BUG-002 usou bundle antigo retido pelo service worker cache-first;
- BUG-005 foi reproduzido em `renewUser()` com estados local/remoto parciais e refresh confundido com escrita;
- compatibilidade de schema, renovação reconciliada e PWA network-first foram implementados;
- versão do recurso e cache atualizados para `0.68.0-users-ux`.
- BUG-001 reproduzido com stubs: uma edição de campo mutável criava duas ocorrências e `fixed → none` não encerrava a série;
- BUG-001 corrigido com identidade estável, atualização atual/futuras e UUID determinístico por competência;
- versão do recurso e cache avançados para `0.68.0-bug001-recurring`.
- teste manual aprovou a série nova, mas revelou reaparecimento após excluir a série legacy “aluguel”;
- residual legacy reproduzido e corrigido com marcador persistente de encerramento, sem apagar histórico pago;
- bundle/cache atuais avançados para `0.68.0-bug001-legacy`.
- BUG-003 reproduzido: o resumo selecionava o mês atual e o detalhe avançava para o mês do próximo fechamento;
- criada coleção compartilhada `cardInvoiceItems()` para resumo e detalhe, com 20/20 testes estruturais aprovados;
- a primeira correção avançou bundle/cache para `0.68.0-bug003-cards`, sem alterar o BUG-004;
- teste manual confirmou a coerência dos itens pendentes, mas uma compra paga ficou ausente de Compras do Cartão;
- o residual foi reproduzido: `cardInvoiceItems()` descartava pagos. A coleção completa e a coleção pendente foram separadas, o total continua exclusivamente pendente e 20/20 testes residuais passaram;
- três compras reais `cartao nu teste 11.8` foram localizadas: primeiras parcelas em setembro eram descartadas porque a tela usava agosto como alvo;
- `cardInvoiceTargetMonth()` passou a derivar a competência pelo fechamento e `payablesCardGroups()` aplica a regra por cartão;
- BUG-007 foi reproduzido em `saveCardPurchase()`: status Pago atribuía todas as chaves; o modal agora coleta `Parcelas já pagas` e gera somente as primeiras N como pagas;
- 13 testes conjuntos passaram; BUG-003 e BUG-007 foram posteriormente homologados pelo proprietário.
- filtro visual compacto adicionado a Compras do Cartão: Pendentes padrão, Pagos por quitação total e competência mensal; 18/18 testes estruturais passaram.
- a UX do filtro preservou BUG-003/007; ambos foram posteriormente homologados pelo proprietário.
- BUG-008 foi reproduzido em `saveCardPurchase()`: a primeira parcela usava o fechamento futuro e as N primeiras chaves futuras eram marcadas como pagas.
- BUG-008 agora recua N competências a partir de `cardInvoiceTargetMonth()`, usa o vencimento real do cartão e mostra uma prévia recolhível alimentada pelo mesmo cronograma persistido.
- Testes estruturais de 6x/0, 6x/1, 6x/3, 6x/6, 12x/5, vencimento futuro/vencido, virada de ano, fevereiro bissexto e prévia=persistência passaram.
- BUG-008 foi homologado pelo proprietário: os vencimentos nos dias 07 e 21, o recuo das parcelas pagas, a competência atual, os estados e a prévia discreta/recolhível foram aprovados. BUG-003, BUG-004 e BUG-007 permaneceram preservados.
- BUG-009 foi reproduzido: receitas usavam identidade derivada de campos mutáveis, não possuíam encerramento persistente e não participavam dos planos temporais do BUG-001.
- BUG-009 agora persiste identidade/encerramento em `receitas.recorrencia`, altera ou encerra somente a competência atual e futuras e preserva o passado. Os cards mostram Mensal/Não repete discretamente.
- 20/20 testes estruturais passaram.
- BUG-009 foi homologado pelo proprietário: Mensal → Não repete, salvamento, refresh/reload, exclusão sem reaparecimento, regra atual+futuras, histórico anterior e tipo de repetição no card foram aprovados. BUG-001 e BUG-008 permaneceram preservados.
- BUG-010 foi homologado pelo proprietário para Nova Receita, Nova Despesa e Nova Compra. Navegação, refresh, restauração, campos dinâmicos, Prévia do BUG-008, descarte, limpeza após salvamento e isolamento entre usuários foram aprovados.
- a UX do filtro de Compras do Cartão foi homologada pelo proprietário: Pendentes, Pagos, mês, compra parcialmente paga, parcela paga visível, total pendente e visual discreto aprovados.
- a homologação específica da UX não alterou os bugs naquele momento; a homologação formal posterior de BUG-003/007 está registrada nos documentos próprios.

EC-18.9 e todas as separações anteriores foram preservadas.

## O que está homologado?

- Fase 1 e Baseline Oficial.
- EC-10.
- EC-12, EC-13, EC-14, EC-15 e EC-17.

## O que está apenas implementado?

- EC-18.1, EC-18.2, EC-18.3, EC-18.5, EC-18.6, EC-18.7, EC-18.8.1, EC-18.8.2, EC-18.9, EC-18.10.1, EC-18.10.2 e EC-18.10.3.
- BUG-002, homologado pelo proprietário.
- BUG-005, homologado pelo proprietário.
- BUG-006, homologado pelo proprietário após confirmar bloqueio, ausência de sessão e mensagem exata no DOM.
- BUG-001, homologado pelo proprietário após criação, edição, exclusão e refresh sem reaparecimento.
- EC-18.4 não foi implementação; foi APR.
- Não há evidência documental de homologação das EC-18.x.

## O que está apenas em APR?

- EC-18.4: separação dos loaders/campos públicos.
- Nenhuma separação adicional de materialização runtime foi identificada.

## Qual é o próximo ponto oficial?

BUG-001, BUG-002, BUG-003, BUG-004, BUG-005, BUG-006 e BUG-007 estão homologados. O BUG-004 foi aprovado manualmente pelo proprietário em 12/08/2026.

## Escopo exato preservado

  - Preservar o recurso publicado `/app.js?v=0.68.2`; a origem 4178 permanece como servidor local oficial para validações.
- Preservar a homologação do centro: Nubank vencido único em R$ 262,50 e Caixa fechada em R$ 62,50.
- Preservar BUG-003, BUG-006 e BUG-007.

## Arquivos provavelmente envolvidos

- `app.js`
- `index.html` apenas para versionamento determinístico
- `sw.js` apenas para renovação do cache PWA

## Áreas fora do escopo proposto sem nova autorização

- produção;
- banco e migrations;
- Supabase Auth;
- RLS/policies;
- cadastro/autocadastro;
- edição Master;
- bugs financeiros;
- login dual fora do necessário para regressão.

## Riscos restantes

- persistências Master continuam multi-etapas; estados parciais agora são diferenciados, mas ainda exigem ação manual posterior;
- homologação não possui três campos opcionais de endereço;
- RLS ausente;
- sete usuários legacy na homologação, conforme leitura de 12/08/2026;
- duplicidades financeiras preservadas na baseline;
- RLS permanece ausente e exige preparação própria antes de futura ativação.

## Informações operacionais de encerramento

Saldo de créditos, nome de ZIP utilizado/gerado e estado operacional de cada encerramento devem ser consultados no Relatório Oficial do Dia correspondente. Esses valores não são mantidos neste handoff permanente.

## Versionamento técnico

- Versão publicada: `0.68.2`.
- Recurso em produção: `/app.js?v=0.68.2`.
- Cache em produção: `meu-bolso-v0.68.2`.
- Estratégia PWA: network-first; caches antigos são removidos na ativação. Uma PWA já aberta pode precisar ser fechada e aberta uma vez, sem limpeza manual de cache em condições normais.

## Próxima ação

O proprietário deve validar rapidamente a produção `0.68.2` e enviar o resultado ao ChatGPT para revisão final. Não iniciar BUG-011 automaticamente.
