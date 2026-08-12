# ESTADO POR FUNCIONALIDADE

Legenda:

- **Homologada**: validação aprovada pelo proprietário.
- **Implementada**: código presente, ainda sem homologação comprovada.
- **APR**: somente análise/proposta.
- **Não iniciada**: nenhuma implementação autorizada.

| Funcionalidade | Estado | EC responsável | Testada | Homologada | Risco |
|---|---|---|---|---|---|
| Login legacy | Preservado; usa validação REST transitória e projeção pública | EC-18.1, 18.5, 18.6 | Técnica/estrutural | Não para EC-18.x | Alto enquanto senha legacy existir |
| Login Auth | Piloto funcional; dual login em homologação | Piloto Auth, EC-15 | Sim | EC-15 declarada homologada | Alto até todos os usuários migrarem |
| Master Global | Contexto separado | EC-10, 18.7 | Sim | EC-10 | Alto sem RLS |
| Minha Conta | Perfil público sanitizado; normalizador sem credenciais | EC-10, 18.9, 18.10.1 | Técnica e prova isolada | Não para EC-18.x | Baixo no carregamento; cadastro ainda é risco separado |
| Troca de contexto Master/Conta | Preservada com geração/contexto | EC-10, 13/14/15 | Sim | Sim nas ECs declaradas | Médio |
| Sessão | IDs/modo/contexto; sem senha intencional | EC-13/15 | Sim | Sim | Médio |
| Cache local | Sanitiza `password`/`senha`; normalização não recria credencial | EC-12, 18.10.1 | Sim/técnica | EC-12 | Baixo neste caminho |
| Fila offline | Remove/bloqueia operações com credencial | EC-12 | Sim | Sim | Médio |
| Troca de senha legacy | Helpers dedicados; online-only | EC-18.1 | Teste controlado com dados fictícios e validação técnica; não equivale a E2E real | Não comprovada | Alto até hash/Auth completo |
| Troca de senha Auth | Não implementada nesta trilha | — | Não | Não | Alto |
| Cadastro público | Perfil público separado da senha transitória; criação online-only | EC-18.10.2 | Técnica/estrutural | Não | Alto enquanto senha legacy existir |
| Cadastro pelo Master | Criação remota e pós-cadastro confirmados; Novo usuário em tela exclusiva | EC-18.10.2/BUG-002/UX Usuários | Técnica/estrutural + manual | Sim, pelo proprietário | Médio: inicialização continua multi-etapas |
| Renovação pelo Master | PATCH, histórico e refresh reconciliados separadamente | BUG-005 | Técnica/estrutural + manual | Sim, pelo proprietário | Médio: histórico pode ficar parcial e ser informado |
| Login de usuário bloqueado | Formulário retido antes do fluxo assíncrono; mensagem específica após credenciais válidas; sem sessão | BUG-006 | 10 cenários técnicos + manual | Sim, pelo proprietário | Baixo |
| Edição Master de usuário | PATCH legacy específico; senha não entra no objeto local | EC-18.10.3 | Técnica/estrutural | Não | Médio; BUG-002 permanece separado |
| Loaders de usuários | Projeção pública sem `senha`, compatível por ambiente com campos opcionais de endereço | EC-18.5/6/7, BUG-002/005 | Técnica + GET real somente leitura | Não comprovada | Médio |
| Conversor Supabase → runtime | Não gera `password` | EC-18.8.1 | Técnica | Não | Baixo |
| Conversor runtime → Supabase | Não gera usuários/senha | EC-18.8.2 | Técnica | Não | Baixo |
| Persistência financeira | Nove payloads; não persiste usuários | EC-18.2/18.8.2 | Técnica | Não comprovada | Médio |
| Normalização do banco | Não cria nem recria senha | EC-18.10.1 | Técnica e prova isolada | Não | Baixo |
| Seed runtime | Não contém campos de senha | EC-18.10.1 | Inspeção estática | Não | Baixo |
| Receitas/despesas | BUG-001 com identidade estável, regra temporal e encerramento persistente legacy | BUG-001 / Release 0.68.0 | Estrutural + manual | Sim, pelo proprietário | Baixo: séries legacy historicamente idênticas continuam indistinguíveis |
| Cartões/compras/parcelas | BUG-003 usa competência por fechamento; BUG-007 preserva status individual; detalhe possui filtro Pendentes/Pagos/por mês | BUG-003, BUG-007 e UX filtro / Release 0.68.0 | 13 testes funcionais + 18 testes do filtro + teste manual | BUG-003, BUG-007 e UX filtro homologados pelo proprietário | Baixo neste fluxo |
| Notificações de cartão | Centro usa `currentInvoice()`/mês civil; PWA usa referência de fechamento como vencimento | BUG-004 | APR/precheck e matriz futura de 16 cenários | Não | Alto: competência, data e duplicidade podem divergir |
| Ferramenta temporária de parcela | Removida do código e do banco de homologação por evidência registrada | EC-18.3 | Técnica | Homologação do proprietário não comprovada | Baixo |
| PWA/versionamento | Bundle `0.68.0-bug006-login-alert` determinístico | EC-17, BUG-002/005/006/UX Usuários/BUG-001/BUG-003/BUG-007/UX filtro | Sintaxe/técnica | EC-17 | Médio |
| Service Worker | Network-first com fallback offline | EC-17, BUG-002/005 | `node --check` + stub | Não para correção atual | Médio |
| RLS | Desativada | Fase futura | Não | Não | Crítico |
| Policies | Nenhuma | Fase futura | Não | Não | Crítico |
| Produção | Release 0.68.0; sem ECs de segurança | Baseline | Sim | Sim | Não alterar |
