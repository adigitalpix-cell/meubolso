# MEU BOLSO — INÍCIO DE NOVA CONVERSA

## O QUE É O PROJETO

MEU BOLSO é um PWA financeiro estático, mobile first, publicado pela Vercel e integrado ao Supabase. O sistema administra usuários, receitas, despesas, recorrências, cartões, compras parceladas, parcelas, categorias, tipos de conta, suporte e renovações.

O frontend é composto principalmente por `index.html`, `app.js` e `styles.css`. O navegador acessa o Supabase por REST e, durante a migração de segurança, também usa Supabase Auth. O vínculo financeiro continua sendo `public.usuarios.id`; `auth.users.id` é associado por `public.usuarios.auth_user_id` sem substituir o UUID financeiro.

## COMO COMEÇAR

1. Leia `METODO_OFICIAL_DE_TRABALHO.md` para aplicar o fluxo eficiente e não bloqueante.
2. Leia integralmente os demais arquivos pertinentes de `DOCUMENTACAO_PROJETO`.
3. Leia o Relatório Oficial do Dia mais recente em `DOCUMENTACAO_PROJETO/RELATORIOS_DO_DIA`.
4. Revise o código real do pacote/worktree fornecido.
5. Compare documentação e código.
6. Como fluxo padrão, identifique a próxima tarefa planejada e obtenha autorização expressa antes de implementar. O proprietário pode redefinir diretamente essa prioridade.

O método oficial define ChatGPT como Coordenador/Analista, o proprietário como Decisor/Homologador e o Codex como Executor Técnico. Não replicar o método neste arquivo; consultar sua fonte central.

## FONTES DE VERDADE

Ordem oficial:

1. código real do pacote fornecido;
2. `DOCUMENTACAO_PROJETO`;
3. Relatório Oficial do Dia mais recente;
4. instruções expressas do proprietário na conversa atual.

Uma instrução expressa que proíba uma ação deve sempre ser respeitada. Diante de conflito material entre fontes, o fluxo recomendado é informar o conflito e obter decisão; uma decisão expressa do proprietário pode autorizar o caminho seguro a seguir.

## AMBIENTES

| Ambiente | Project Ref | Região | Regra |
|---|---|---|---|
| Homologação | `ncgfwatsciwzzhqlspvy` | AWS `us-west-2` | Único destino permitido para testes/mudanças de segurança quando houver autorização explícita |
| Produção | `hdldbvexlxsbboaxwrut` | AWS `us-east-2` | Proibido alterar sem autorização explícita e fase de produção aprovada |

- Branch de trabalho: `develop`.
- Branch de produção: `main`.
- HEAD base atualmente confirmado: `b82e6abbe96ca8220a0fbac39c41969807acc83f` (`chore: release 0.68.0`).
- Runtime local atual: homologação.
- Nunca registrar chaves existentes em `supabase-config.js` na documentação.

## SERVIDOR LOCAL OFICIAL

- Origem única: `http://127.0.0.1:4178/`.
- Raiz servida: `C:\Projetos\meubolso`.
- Antes de qualquer teste manual ou automatizado, confirmar que a origem oficial está servindo o worktree atual.
- Não abrir `C:/Projetos/meubolso/index.html` diretamente por `file://`.
- Não criar nova porta por rodada. Exceções exigem necessidade técnica comprovada e retorno posterior à 4178.
- Query strings como `?users-ux=1`, `?master-write-sync=1` e `?bug002-post-confirm=1` são identificadores históricos; o bundle é definido pelos arquivos atuais.
- Não limpar automaticamente localStorage, sessão, banco local ou dados de teste.

## ESTADO ATUAL

- Fase 1 concluída: auditoria, backup, homologação, restauração, comparação e baseline.
- Baseline oficial: `BASELINE_PRODUCAO_MEU_BOLSO.md`.
- Produção de referência: versão `0.68.0`, commit `b82e6abbe96ca8220a0fbac39c41969807acc83f`.
- Homologação contém cópia funcional fiel do schema `public` e dados da baseline de produção.
- Migração Auth gradual iniciada somente em homologação.
- Última evidência histórica de Auth: 1 usuário piloto Auth vinculado e 5 usuários legacy; não tratar como consulta em tempo real.
- RLS permanece desativada nas 10 tabelas públicas; policies públicas: 0.
- EC-10 e EC-12/13/14/15/17 foram declaradas homologadas.
- EC-18.1, 18.2, 18.3, 18.5, 18.6, 18.7, 18.8.1, 18.8.2, 18.9, 18.10.1, 18.10.2 e 18.10.3 estão implementadas tecnicamente no worktree; EC-18.4 e EC-18.10 são APRs. Não confundir implementação com homologação.
- EC-18.10 foi a APR que autorizou a separação EC-18.10.1.
- Recurso atual: `/app.js?v=0.68.0-bug006-login-alert`.
- Cache atual: `meu-bolso-v0.68.0-bug006-login-alert`.
- Homologação usa `userProfileAddressFieldsEnabled: false` porque não possui `endereco`, `cidade` e `estado`.
- O worktree contém alterações acumuladas não commitadas sobre o release `0.68.0`.

## PRÓXIMA TAREFA

EC-18 permanece tecnicamente concluída no objetivo de zero credenciais runtime. BUG-001, BUG-002, BUG-003, BUG-005, BUG-006 e BUG-007 foram homologados pelo proprietário. A UX do filtro compacto Pendentes/Pagos/por mês permanece homologada. BUG-004 possui APR/precheck concluído, sem implementação ou homologação.

Próximo ponto oficial: aguardar nova autorização expressa do proprietário. Não iniciar BUG-004 ou outro bug automaticamente. Conforme DEC-019, a prioridade futura será definida pelo proprietário com preservação das dependências técnicas concretas.

## LIMITES ATUAIS SEM NOVA AUTORIZAÇÃO

- Não alterar produção.
- Não ativar RLS nem criar policies antes da migração Auth e dos testes de compatibilidade.
- Não trocar `public.usuarios.id` por `auth.users.id`.
- Não apagar senhas legacy enquanto houver usuários não migrados.
- Não migrar os outros cinco usuários Auth sem escopo e autorização específicos.
- Não remover o login legacy antes do fim da transição.
- Como padrão, manter cadastro/autocadastro ou edição Master em escopo próprio, salvo autorização expressa diferente.
- Como padrão, manter BUG-001/002/003/004 separados das ECs de fundação de segurança, salvo escopo combinado expressamente autorizado e tecnicamente seguro.
- Não corrigir dados duplicados da baseline sem plano, backup e autorização.
- Não executar commit, push, merge ou deploy sem autorização explícita.
- Não expor senha, chave, token, JWT ou connection string completa.

## DECISÕES OFICIAIS CRÍTICAS

- Migração Auth gradual e reversível.
- UUID financeiro `public.usuarios.id` é imutável.
- `auth_user_id` é vínculo adicional e inicialmente anulável.
- Login legacy permanece durante a transição.
- Autocadastro público e cadastro pelo Master Global devem continuar existindo.
- RLS somente depois que o contexto Auth estiver pronto para todos os fluxos necessários.
- Dados e histórico financeiro não podem ser apagados.
- Produção não é ambiente de investigação.
- O fluxo padrão de segurança usa separações mínimas: APR, implementação, validação e homologação. O proprietário pode ajustar o processo, preservados os controles técnicos necessários.

Leia `DECISOES_OFICIAIS_CRITICAS.md` para o registro completo.

## RISCOS ABERTOS

- Autocadastro e criação pelo Master agora separam perfil público e senha transitória.
- Edição Master preserva o PATCH específico sem atribuir senha ao objeto local.
- RLS e policies continuam ausentes.
- Cinco usuários continuam no login legacy.
- Existem inconsistências financeiras preservadas na baseline, inclusive duplicidade por `parcela_id`.
- Alterações acumuladas ainda não foram commitadas nem publicadas.

## COMO TRABALHAR

Fluxo padrão recomendado:

```text
APR
  ↓
implementação mínima autorizada
  ↓
validação técnica e regressão
  ↓
homologação pelo proprietário
  ↓
próxima APR
```

Cada entrega deve declarar separadamente: implementado, testado tecnicamente, testado E2E, homologado, commitado e publicado.
