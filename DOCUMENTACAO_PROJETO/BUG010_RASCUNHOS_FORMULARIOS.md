# BUG-010 — Rascunho automático de formulários

Data: 12/08/2026.

Status: **HOMOLOGADO PELO PROPRIETÁRIO EM 12/08/2026**.

## Sintoma e causa raiz

Receita, Despesa e Compra no Cartão mantinham o cadastro em andamento somente nos inputs do DOM. A reabertura de Receita/Despesa executava `form.reset()`; Nova Compra era recriada por `render()`. Troca de tela, refresh ou reabertura da PWA eliminavam esse estado transitório.

Não existia mecanismo anterior de draft nem estado global reutilizável. O aplicativo já utiliza `localStorage`, que é compatível com a persistência local entre navegação, refresh e reabertura.

## Formulários cobertos

- Nova Receita, pelo `#transaction-form` compartilhado;
- Nova Despesa, pelo `#transaction-form` compartilhado;
- Nova Compra no Cartão, pelo `#purchase-form` gerado por `purchaseFormTemplate()`.

Cartão, categoria, usuário, suporte e segurança não foram incluídos: não compartilham uma abstração segura com os três formulários prioritários e ampliariam o escopo.

## Implementação

- helpers centralizados de leitura, escrita, restauração e descarte em `localStorage`;
- chave por UUID financeiro, tipo de cadastro e, em compras, cartão relacionado;
- lista branca de campos, sem senha, e-mail, token, sessão ou credencial;
- autosave por `input`/`change`, sem criar draft para formulário intocado;
- restauração automática e aviso discreto `Rascunho restaurado`;
- campos controladores restaurados antes dos dependentes;
- Compra restaura pagamento, parcelas, parcelas já pagas, status e estado aberto da Prévia;
- ação explícita `Descartar`, com confirmação somente quando existe conteúdo;
- fechar, navegar ou recarregar preserva o draft;
- sucesso remoto limpa o draft; falha preserva o draft e restaura o estado local anterior da compra;
- criação e edição permanecem separadas; edições não leem nem gravam draft de novo cadastro.

O draft de cada usuário permanece no dispositivo após logout, mas somente volta a ser acessível quando o mesmo UUID financeiro iniciar sessão. Outro usuário recebe uma chave diferente.

## Testes

20/20 testes estruturais aprovados, cobrindo tipos independentes, isolamento por usuário, formulário vazio, gravação/restauração, refresh/reabertura, descarte, JSON inválido, versão incompatível, lista branca, campos dinâmicos, Prévia, isolamento de edição, limpeza após sucesso, preservação após falha e ausência de Supabase/fila offline.

Também aprovados:

- `node --check app.js`;
- `node --check sw.js`;
- `git diff --check`;
- bundle do worktree servido em `http://127.0.0.1:4178/`;
- carregamento local sem erro ou aviso de JavaScript.

O runtime autenticado não foi exercitado pelo Codex por ausência de credenciais autorizadas e para não criar registros financeiros reais.

## Homologação manual

O proprietário aprovou manualmente:

- rascunhos de Receita, Despesa e Compra no Cartão;
- troca de tela, refresh e restauração;
- campos dinâmicos e Prévia do BUG-008;
- descarte explícito;
- limpeza do draft após salvamento;
- isolamento entre usuários.

Resultado oficial: **BUG-010 HOMOLOGADO PELO PROPRIETÁRIO**.

## Preservações e limites

BUG-001, BUG-008 e BUG-009 não tiveram suas regras alteradas. O draft não gera ocorrência, recorrência ou escrita remota antes do submit. Banco, schema, Auth, RLS, policies e produção não foram alterados. Não houve commit, push ou deploy.
