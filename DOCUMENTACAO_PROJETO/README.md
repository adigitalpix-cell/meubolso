# MEU BOLSO — DOCUMENTAÇÃO ACUMULADA

Esta pasta registra o estado acumulado e operacional do projeto MEU BOLSO. Ela deve ser distribuída junto com o código mais recente.

## Ordem recomendada de leitura

1. `METODO_OFICIAL_DE_TRABALHO.md`
2. `00_INICIAR_NOVA_CONVERSA.md`
3. `HANDOFF_ATUAL.md`
4. `STATUS_ATUAL.md`
5. `PROXIMA_RETOMADA.md`
6. `DECISOES_OFICIAIS_CRITICAS.md`
7. `MAPA_DE_DEPENDENCIAS.md`
8. `ESTADO_POR_FUNCIONALIDADE.md`
9. `ARQUIVOS_CRITICOS.md`
10. `ARQUITETURA_MODELO_E_FLUXOS.md`
11. `MATRIZ_ECS_BUGS_REGRESSAO.md`
12. `VALIDACAO_FINAL_EC18.md`
13. `BUG001_RECORRENCIA_DUPLICADA.md`
14. `BUG002_CADASTRO_MASTER.md`
15. `BUG003_CARTOES_RESUMO_DETALHE.md`
16. `BUG005_RENOVACAO_MASTER.md`
17. `BUG006_LOGIN_BLOQUEADO.md`
18. `BUG007_PAGAMENTO_INICIAL_COMPRA_PARCELADA.md`
19. `UX_FILTRO_COMPRAS_CARTAO.md`
20. Auditoria mais recente em `AUDITORIAS/`
21. `CHECKLIST_NOVA_CONVERSA.md`
22. Relatório mais recente em `RELATORIOS_DO_DIA/`

## Função de cada artefato

- Pacote de código fornecido: implementação real e migrations disponíveis.
- `DOCUMENTACAO_PROJETO`: estado acumulado, decisões, riscos e retomada.
- Relatório Oficial do Dia: histórico do que ocorreu naquele dia.
- `AUDITORIAS`: confrontos documentais datados, com evidências e limitações.

O pacote completo de continuidade é:

```text
PACOTE DE CÓDIGO + DOCUMENTACAO_PROJETO + RELATÓRIO OFICIAL DO DIA MAIS RECENTE
```

Créditos, nomes de ZIPs e outras informações operacionais de encerramento pertencem exclusivamente ao Relatório Oficial do Dia, quando solicitado. Não são estado permanente desta documentação.

## Regra de divergência

Se documentação e código divergirem, registrar a divergência, identificar qual artefato está desatualizado e informar o proprietário. O fluxo padrão é esclarecer antes de implementar, mas uma autorização expressa do proprietário pode definir a fonte aplicável e permitir o avanço seguro.

Nenhum arquivo desta pasta deve conter senha, token, JWT, chave administrativa, `service_role`, connection string completa ou conteúdo de `usuarios.senha`.

## Estado de autossuficiência

O pacote está **parcialmente autossuficiente**. Ele permite entender arquitetura, fluxos, riscos, ECs e bugs, mas a retomada que envolva banco ainda exige revalidar o ambiente real e consultar evidências externas de homologações anteriores. A auditoria mais recente registra as lacunas exatas.

## Autoridade do proprietário

Esta documentação estabelece o fluxo padrão recomendado. APRs, auditorias, matrizes, checkpoints e checklists não bloqueiam uma execução expressamente autorizada pelo proprietário da Alex Digital. A autorização pode mudar processo e prioridade, mas não elimina riscos técnicos concretos nem autoriza extrapolar o escopo concedido.

O fluxo operacional e a divisão de responsabilidades estão centralizados em `METODO_OFICIAL_DE_TRABALHO.md`.

## Regra permanente de servidor local

Antes de qualquer teste manual ou automatizado, confirmar que o servidor oficial `http://127.0.0.1:4178/` está servindo diretamente `C:\Projetos\meubolso`.

- Não abrir `index.html` por `file://`.
- Não criar portas novas por rodada.
- Query strings identificam o cenário, mas não representam versão do código.
- Exceção de porta exige necessidade técnica comprovada e documentada; após o teste, retornar à origem oficial.
- Preservar a mesma origem permite comparar localStorage, sessão, Cache Storage, service worker e comportamentos dependentes de estado.
