# BASELINE PRODUCAO MEU BOLSO

## Identificacao

- Data da baseline: 2026-08-08
- Aplicacao: MEU BOLSO
- Versao: 0.68.0
- Branch oficial de producao: `main`
- Commit de referencia de producao (`origin/main`): `b82e6abbe96ca8220a0fbac39c41969807acc83f`
- Project Ref de producao: `hdldbvexlxsbboaxwrut`
- Project Ref de homologacao: `ncgfwatsciwzzhqlspvy`
- Regiao de producao: AWS `us-east-2`
- Regiao de homologacao: AWS `us-west-2`

Os Project Refs sao distintos. O destino da restauracao nao foi o projeto de producao.

## Artefatos de backup

### Backup completo

- Arquivo: `C:\Users\delax\MEU_BOLSO_BACKUPS\2026-08-08\meu_bolso_producao_full_2026-08-08.dump`
- Tamanho verificado: 340.064 bytes
- Formato verificado pela assinatura do arquivo: PostgreSQL CUSTOM (`PGDMP`)
- Banco de origem informado: PostgreSQL 17.6
- Ferramenta informada: `pg_dump` 18.4
- TOC informado: 597 entradas
- SHA-256 verificado: `DB28CD45E1AE51856C49AA0CF25591A6FC1B32DDD064376BE2C65C46003D6195`

### Backup somente de schema

- Arquivo: `C:\Users\delax\MEU_BOLSO_BACKUPS\2026-08-08\meu_bolso_producao_schema_2026-08-08.sql`
- Tamanho verificado: 250.259 bytes
- Linhas verificadas: 7.081
- Leitura do arquivo: confirmada
- SHA-256 verificado: `070EB95840AAA1DFB0178ED5CB9E68C63E0049B6FB3F87EE0BDD2EA5192440ED`

Os dois artefatos estao armazenados fora da arvore Git do projeto.

## Comparacao de contagens

| Tabela | Producao | Homologacao | Diferenca | Resultado |
|---|---:|---:|---:|---|
| usuarios | 6 | 6 | 0 | Igual |
| receitas | 36 | 36 | 0 | Igual |
| despesas | 222 | 222 | 0 | Igual |
| cartoes | 12 | 12 | 0 | Igual |
| compras_cartao | 15 | 15 | 0 | Igual |
| parcelas | 88 | 88 | 0 | Igual |
| categorias | 52 | 52 | 0 | Igual |
| tipos_conta | 32 | 32 | 0 | Igual |
| suporte | 0 | 0 | 0 | Igual |
| renovacoes | 2 | 2 | 0 | Igual |

## Comparacao estrutural do schema public

| Objeto | Producao | Homologacao | Resultado |
|---|---:|---:|---|
| Tabelas publicas | 10 | 10 | Igual |
| Funcoes publicas | 4 | 4 | Igual |
| Triggers publicos | 9 | 9 | Igual |
| Indices publicos | 25 | 25 | Igual |
| Tabelas com RLS | 0 | 0 | Igual |
| Policies publicas | 0 | 0 | Igual |

## Comparacao de integridade

| Verificacao | Producao | Homologacao | Resultado |
|---|---:|---:|---|
| Grupos duplicados por parcela_id | 1 | 1 | Igual |
| Linhas excedentes | 1 | 1 | Igual |
| card-installment sem parcela_id | 101 | 101 | Igual |
| Parcelas pagas | 37 | 37 | Igual |
| Despesas auxiliares pagas com parcela_id | 25 | 25 | Igual |
| Parcelas pagas com multiplas despesas auxiliares | 1 | 1 | Igual |
| Parcelas duplicadas por compra e numero | 0 | 0 | Igual |
| Compras sem cartao | 0 | 0 | Igual |
| Parcelas sem compra | 0 | 0 | Igual |
| Registros sem usuario | 0 | 0 | Igual |
| Vinculos cruzados entre usuarios | 0 | 0 | Igual |

As inconsistencias existentes foram preservadas. Nenhuma duplicidade ou registro legado foi corrigido durante a restauracao.

## Evidencia de restauracao

O backup completo foi utilizado na homologacao. Os objetos e dados do schema `public` necessarios ao MEU BOLSO foram restaurados, e suas contagens, estrutura e indicadores de integridade correspondem a producao.

A execucao de `pg_restore --clean` apresentou erros `must be owner` ao tentar limpar ou recriar objetos gerenciados pelo Supabase, principalmente nos schemas `auth`, `storage` e `realtime`, em event triggers e em outros objetos internos da plataforma.

Esses erros sao classificados como limitacao esperada de ownership em ambiente PostgreSQL gerenciado. Eles impedem declarar uma clonagem integral da plataforma Supabase, mas nao impedem considerar fiel a copia funcional do schema `public` e dos dados do MEU BOLSO, pois todos os objetos publicos, contagens e verificacoes definidas para a aplicacao coincidiram.

Nao se deve tentar remover, substituir ou assumir ownership dos objetos internos gerenciados pelo Supabase.

## Limitacoes e riscos preservados

- Producao e homologacao estao em regioes distintas.
- RLS permanece desabilitada nas dez tabelas publicas em ambos os ambientes.
- Nao existem policies publicas.
- Existe um grupo duplicado por `parcela_id`, com uma linha excedente.
- Existem 101 despesas `card-installment` sem `parcela_id`.
- Existe uma parcela paga com multiplas despesas auxiliares.
- A baseline valida o escopo funcional do MEU BOLSO no schema `public`; nao valida clonagem integral dos servicos internos gerenciados pelo Supabase.

## Controles de seguranca

- Nenhum dado de producao foi apagado ou alterado no fechamento desta etapa.
- Nenhuma migration funcional foi aplicada.
- Supabase Auth nao foi alterado.
- RLS e policies nao foram alteradas.
- Nenhum UUID foi alterado.
- Nenhuma correcao de bug foi realizada.
- Nenhuma credencial administrativa, senha, token ou connection string foi registrada nesta baseline.

## Parecer

- Backup restauravel do MEU BOLSO: **SIM**
- Homologacao do schema `public` e dos dados do MEU BOLSO fiel a producao: **SIM**
- Erros dos objetos internos do Supabase bloqueiam a baseline: **NAO**
- Baseline pode ser homologada: **SIM**
- Etapa 1 — Auditoria visual e funcional: **CONCLUIDA**
- Etapa 2 — Auditoria tecnica e producao: **CONCLUIDA**
- Etapa 3 — Backup e homologacao: **CONCLUIDA**
- Etapa 4 — Restauracao, comparacao e Baseline Oficial: **CONCLUIDA**
- Fase 1 — Auditoria, Contencao e Preparacao Segura: **CONCLUIDA**
- Proximo ponto oficial: **revisao e autorizacao expressa para iniciar a Fase 2**
