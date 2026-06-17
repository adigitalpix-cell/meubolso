# Migração para Supabase

Este diretório prepara a estrutura online do app Minhas Finanças.

## Arquivos

- `schema.sql`: cria as tabelas `usuarios`, `receitas`, `despesas`, `cartoes`, `compras_cartao`, `parcelas`, `suporte`, `renovacoes` e tabelas auxiliares de categorias/tipos de conta.
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
