# BUG-002 — CADASTRO MASTER INCONSISTENTE

## Estado

**HOMOLOGADO PELO PROPRIETÁRIO.** Teste manual confirmou criação, mensagem correta, fechamento do formulário, retorno à lista e uma única ocorrência do usuário.

## Homologação final do proprietário

O ciclo manual posterior à correção confirmou:

1. usuário criado remotamente;
2. mensagem correta;
3. formulário fechado;
4. retorno automático para a lista;
5. usuário exibido uma única vez.

A melhoria UX posterior reutiliza integralmente `saveUser()`/`saveUserOnce()` e não altera a lógica remota homologada.

## Reprodução manual real mais recente

- O usuário `joao` foi criado remotamente e apareceu na lista.
- A UI mostrou `Não foi possível cadastrar o usuário.` mesmo com a persistência confirmada.
- O formulário `Novo usuário` permaneceu visível, criando risco de repetição.
- Naquele momento o BUG-002 ainda não estava homologado; essa reprodução foi superada pelo ciclo manual final registrado acima.

## Causa exata do falso erro

`saveUser()` recebia o elemento por `event.currentTarget`, mas `saveUserOnce()` voltava a usar `event.currentTarget.reset()` depois de operações assíncronas. No navegador, `currentTarget` pertence somente à execução síncrona do listener e pode estar `null` depois do primeiro `await`.

Assim, o POST podia concluir e definir a confirmação remota, mas a tentativa posterior de executar `reset()` em `null` lançava exceção dentro do `try` geral. O fluxo caía no `catch` de falha anterior ao cadastro, mostrava o falso erro e não alcançava o `render()`.

## Correção pós-confirmação

- O formulário é capturado em uma referência estável antes do primeiro `await` e passado diretamente a `saveUserOnce(form)`.
- `remoteUserConfirmed` é o marco irreversível: fica `true` somente após POST confirmado ou reconciliação que encontre exatamente o UUID criado.
- Depois desse marco, nenhuma exceção usa a semântica `Não foi possível cadastrar o usuário.`.
- O modo de criação é fechado e o formulário é resetado assim que a confirmação remota existe, antes das etapas secundárias.
- Falhas de categorias, tipos de conta, refresh, reset ou render são tratadas como sucesso parcial ou necessidade de atualização.
- Se `render()` falhar, o formulário antigo é removido do DOM para impedir novo submit.
- A proteção de Promise única e botão desabilitado foi preservada.

Data da execução controlada: 2026-08-10. Ambiente de teste: stubs REST locais com usuários fictícios. Nenhum banco real foi acessado ou alterado.

## Diagnóstico runtime posterior

- O relato manual exibiu mensagens pertencentes ao release-base que ainda usava `saveDatabase()`, não ao `saveUser()` corrigido.
- O service worker cache-first manteve `/index.html` e o bundle antigo na primeira carga; após atualização do controlador, o bundle correto passou a ser carregado.
- A homologação não possui `usuarios.endereco`, `usuarios.cidade` nem `usuarios.estado`, mas a projeção pública solicitava esses campos.
- `loadUserByUsername()` recebia HTTP 400 / PostgreSQL `42703` antes do POST, impedindo o cadastro.
- A compatibilidade foi tornada explícita por ambiente, sem migration e sem alterar dados.

## Causa raiz comprovada

`saveUser()` executava em um único bloco sequencial:

```text
criar usuário → criar categorias → criar tipos de conta → refresh Master
```

Uma falha após o POST do usuário caía no mesmo tratamento de erro de uma falha anterior à persistência. O rollback removia somente o perfil local, não compensava a escrita remota e mostrava falha genérica. Assim, o usuário podia existir remotamente, desaparecer de `db.users` e ser tentado novamente, produzindo mensagem incompatível ou duplicidade.

## Correção aplicada

- A criação do registro remoto de usuário passou a ser a etapa crítica.
- Categorias, tipos de conta e refresh foram classificados como etapas secundárias independentes.
- Antes do POST, `loadUserByUsername()` consulta o username remoto para mitigar repetição.
- Após erro/timeout do POST, uma nova consulta reconcilia o resultado antes de decidir rollback.
- Se o usuário remoto foi confirmado, o perfil local é preservado e as etapas secundárias continuam isoladamente.
- Se não há prova de persistência remota, o rollback continua exclusivamente local.
- Se o resultado não pode ser confirmado, o estado é informado como ambíguo, o perfil local é preservado e não há retry automático nem exclusão remota.
- Falha de refresh não invalida um cadastro remoto já confirmado.
- A senha continua transitória, é limpa no `finally` e não entra em `db.users`, cache ou fila offline.

## Correção residual de pós-cadastro

- `saveUser()` passou a proteger a operação com uma única Promise ativa e desabilita o botão enquanto o envio está em andamento; clique duplo não dispara um segundo POST.
- Após criação confirmada, `editingUserId` e `userFormOpen` são finalizados explicitamente e o formulário é resetado antes do refresh.
- Se o refresh falhar após criação confirmada, o formulário permanece fechado e a mensagem orienta atualizar a lista, sem permitir repetição involuntária.
- Em falha anterior à criação, o formulário permanece aberto e preserva os campos corrigíveis; somente a senha transitória é apagada.
- A lógica remota de criação, reconciliação e inicialização secundária foi preservada.

## Mensagens

- Sucesso completo: `Usuário cadastrado com sucesso.`
- Falha secundária: `Usuário criado, mas não foi possível concluir a configuração inicial. Atualize e tente completar depois.`
- Falha de refresh: `Usuário criado, mas não foi possível atualizar a lista. Atualize para confirmar os dados.`
- Falha antes da criação: `Não foi possível cadastrar o usuário.`
- Estado ambíguo: `Não foi possível confirmar se o usuário foi criado. Atualize a lista antes de tentar novamente.`

## Testes estruturais

| Cenário | Resultado comprovado |
|---|---|
| Sucesso total | usuário, categorias e tipo de conta preservados; uma mensagem de sucesso |
| Username remoto duplicado | criação bloqueada antes do POST |
| Falha antes de persistir usuário | nenhum usuário remoto/local; rollback local |
| Usuário criado e categorias falham | usuário preservado; tipos de conta tentados; falha parcial informada |
| Usuário criado e tipos de conta falham | usuário e categorias preservados; falha parcial informada |
| Usuário criado e refresh falha | cadastro preservado; mensagem de atualização necessária |
| Timeout após POST | consulta de reconciliação confirma o usuário; sem falso erro |
| Resultado remoto ambíguo | sem retry automático; estado ambíguo informado |
| Repetição manual após falha parcial ou estado ambíguo | bloqueada pelo username local/remoto; nenhum segundo usuário |
| Credencial no perfil local | zero campos `password`/`senha` em `db.users` |
| Finalização visual após sucesso | formulário fechado, campos limpos, lista renderizada e um único toast |
| Criação confirmada com refresh falho | formulário fechado, sem segundo POST e mensagem de atualização |
| Falha definitiva antes da criação | formulário aberto, campos não sensíveis preservados e senha limpa |
| Clique duplo | uma única chamada remota de criação |
| `currentTarget` nulo após o primeiro `await` | referência estável preserva a finalização; sem falso erro |
| Categorias falham após POST | confirmação remota preservada; sucesso parcial; formulário fechado |
| Tipos de conta falham após POST | confirmação remota preservada; sucesso parcial; formulário fechado |
| Reset do formulário falha | confirmação remota preservada; estado fechado; sucesso parcial |
| Render da lista falha | confirmação remota preservada; formulário removido do DOM; orientação de atualizar |
| Timeout reconciliado pelo UUID criado | confirmação remota preservada; sucesso; sem segundo POST |
| Falha anterior ao POST | erro real de cadastro; formulário aberto; nenhum usuário local/remoto criado pelo teste |
| POST HTTP definitivamente falho | erro real de cadastro; rollback local |

Também foram aprovados `node --check app.js`, `node --check sw.js` e `git diff --check` na validação final desta execução.

## Riscos residuais

- A inicialização continua multi-etapas e não é uma transação remota única; categorias ou tipos de conta podem ficar incompletos.
- O sistema agora informa e preserva corretamente esse estado, mas ainda não existe um fluxo dedicado de “completar configuração inicial”.
- Em indisponibilidade simultânea do POST e da consulta de reconciliação, a existência remota permanece temporariamente incerta até refresh/consulta posterior.
- A correção precisa de homologação manual pelo proprietário no runtime de homologação antes de qualquer publicação.

## Escopo preservado

EC-18, login legacy, Supabase Auth, RLS, policies, autocadastro, BUG-001, BUG-003 e BUG-004 não foram funcionalmente alterados por esta correção.
