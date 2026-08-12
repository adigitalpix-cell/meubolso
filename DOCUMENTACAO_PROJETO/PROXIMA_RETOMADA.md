# PRÓXIMA RETOMADA

## Ponto atual

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
- Produção não foi alterada.
- RLS/policies continuam ausentes.

## Próxima ação exata

Concluir e verificar a publicação autorizada da release `0.68.1` em `develop` e `main`, acompanhando o deploy da Vercel.

A migration de `auth_user_id` foi aplicada e validada. `supabase-config.js` local agora aponta para produção com `authDualLoginEnabled: false` e `userProfileAddressFieldsEnabled: false`. A tela de login e a consulta real da projeção efetiva passaram sem `42703`. A release ainda não foi publicada; login real, Master e módulos financeiros não foram testados por ausência de credencial autorizada.
