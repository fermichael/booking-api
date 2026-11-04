# Material de estudo

Esta pasta reúne anotações e exercícios de aprendizado. A aplicação continua no projeto original, em `src/`; não há uma segunda cópia do código.

## Ponto de retomada

Já estão implementados cadastro, login, sessão em memória, horários, disponibilidade, reservas e cancelamento com PostgreSQL. O banco tem proteções contra sobreposição e reservas confirmadas duplicadas.

As próximas funcionalidades estão na seção [Ainda temos que implementar](../README.md#ainda-temos-que-implementar) do README. A documentação técnica fica em `docs/`.

## Como trabalhar em cada exercício

1. Descrever o problema com um exemplo concreto.
2. Identificar os dados necessários e a origem de cada um: sessão, corpo, parâmetros ou banco.
3. Explicar a regra e o resultado esperado antes de escrever código.
4. Identificar quais arquivos precisam mudar e por quê.
5. Tentar implementar, pedir revisão e corrigir os pontos encontrados.
6. Verificar os tipos com `npm run typecheck` e executar os testes adequados à mudança.

Para exercícios isolados, usar arquivos nesta pasta, sem conectá-los às rotas da aplicação. Nenhuma nova funcionalidade foi implementada automaticamente nesta etapa.
