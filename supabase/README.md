# Supabase — estado e migrations do MEU BOLSO

Este diretório contém schemas históricos, migrations e artefatos de teste. Nenhum arquivo daqui é prova isolada de que um objeto foi aplicado em produção ou homologação. A referência de produção é a baseline validada e o histórico efetivamente comprovado no banco.

## Arquivos

- `schema.sql`: schema histórico abrangente das dez tabelas públicas e objetos auxiliares.
- `migration-auth-foundation-v0.68.0.sql`: adiciona `usuarios.auth_user_id`, índice único parcial e FK para `auth.users(id)`. Aplicação comprovada somente em homologação.
- `migration-add-auth-user-id-production-compat-v0.68.0.sql`: migration mínima e idempotente aplicada em produção em 12/08/2026; adicionou somente a coluna `uuid` nullable, sem default.
- `migration-categories-v0.57.sql`, `migration-categories-v0.57.3.sql` e `migration-categories-v0.57.4.sql`: evolução histórica das categorias.
- `migration-installment-date-test-v0.65.0.sql`: criação histórica de uma ferramenta temporária de edição de vencimento de parcelas.
- `migration-remove-installment-date-test-v0.68.0.sql`: revogação e remoção da RPC, trigger e função temporárias. Aplicação em homologação registrada pela EC-18.3.
- `migration-security-profile.sql`: evolução histórica de campos de perfil/segurança.
- `test-data-installments-v0.65.0.sql`: artefato histórico de dados de teste; não executar em produção.
- `config.example.js`: exemplo histórico mínimo localizado neste diretório.
- `../config.example.js`: modelo atual de configuração sem segredo localizado na raiz do projeto.

## Estado atual de autenticação e segurança

- O runtime de homologação usa migração gradual e login dual: Supabase Auth para usuários vinculados e login legacy transitório para usuários ainda não migrados.
- `public.usuarios.id` permanece o UUID financeiro.
- `public.usuarios.auth_user_id` é o vínculo opcional com `auth.users.id`; existe em homologação e produção, mas produção permanece com seis valores NULL e zero usuários Auth.
- Leitura de 12/08/2026 confirmou um usuário piloto Auth e sete usuários legacy na homologação.
- RLS permanece desativada nas dez tabelas públicas e não existem policies públicas na baseline.
- Filtros de `usuario_id` no navegador não substituem isolamento no banco. RLS só pode avançar após APR, compatibilidade completa dos fluxos e autorização.

## Alertas obrigatórios

- A ferramenta temporária de parcelas não está ativa: a migration de remoção substitui o estado criado por `migration-installment-date-test-v0.65.0.sql`.
- Os schemas históricos contêm uma credencial bootstrap fixa para o usuário Master. O valor não deve ser copiado, impresso nem tratado como configuração válida. Isso é risco crítico e exige uma futura correção controlada própria; não foi alterado nesta auditoria.
- Não executar `schema.sql` como migration incremental nem aplicar migrations em produção sem APR, backup, validação e autorização expressa.
- Nunca inserir Secret Key, `service_role`, senha, JWT, token ou connection string completa em arquivos, logs ou documentação.
