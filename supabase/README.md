# Migração para Supabase

Este diretório prepara a estrutura online do app MEU BOLSO.

## Arquivos

- `schema.sql`: cria as tabelas `usuarios`, `receitas`, `despesas`, `cartoes`, `compras_cartao`, `parcelas`, `suporte`, `renovacoes` e tabelas auxiliares de categorias/tipos de conta.
- `migration-categories-v0.57.sql`: adiciona, sem apagar dados, o tipo e o estado ativo das categorias em uma base já existente.
- `migration-categories-v0.57.3.sql`: completa a estrutura usada pela tela Categorias e impede duplicidade de nome/tipo por usuário, sem apagar registros.
- `migration-categories-v0.57.4.sql`: corrige o CRUD completo, timestamps, tipos oficiais e categorias iniciais sem duplicação.
- `migration-installment-date-test-v0.65.0.sql`: cria o RPC protegido e o bloqueio contra alteração direta da data de parcelas; o acesso fica restrito ao usuário real `teste`, com validação de ID, proprietário, status e credencial.
- `test-data-installments-v0.65.0.sql`: prepara até três parcelas pendentes e vencidas exclusivamente para o usuário `teste`, sem alterar valores, quantidades ou parcelas pagas.
- `config.example.js`: modelo para informar a URL e a chave pública do projeto Supabase.

## Como aplicar no Supabase

1. Abra o painel do Supabase.
2. Entre em SQL Editor.
3. Cole e execute o conteúdo de `schema.sql`.
4. Copie `config.example.js` para `supabase-config.js`.
5. Preencha `url` e `anonKey` com os dados reais do projeto.

## Observação de segurança

O app usa login por nome de usuário e senha própria. Para garantir que cada usuário veja apenas seus dados no Supabase, a etapa seguinte precisa ligar esse login a uma camada segura de autenticação.

Sem isso, qualquer proteção feita apenas no JavaScript do navegador não é suficiente para dados reais de clientes, porque a chave pública do Supabase fica visível no aplicativo.

Não foram adicionadas políticas RLS abertas. Enquanto o login próprio não for migrado para Supabase Auth, políticas baseadas em `auth.uid()` bloqueariam o aplicativo e filtros por `usuario_id` no frontend não substituem isolamento no banco.

Para o ajuste temporário de vencimento de parcelas, a versão 0.65.0 usa uma função `security definer` com validação explícita da credencial do usuário `teste`, além de um gatilho que bloqueia `UPDATE` direto na coluna `data_vencimento`. Isso evita criar RLS aberta enquanto o projeto ainda utiliza autenticação própria.
