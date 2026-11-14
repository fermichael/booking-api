# Domain Docs

Como as skills de engenharia devem consumir a documentação de domínio deste repo
ao explorar o código.

## Antes de explorar, leia

- **`GLOSSARY.md`** na raiz do repo, ou
- **`GLOSSARY-MAP.md`** na raiz, se existir: ele aponta para um `GLOSSARY.md` por contexto.
  Leia cada um que for relevante ao assunto.
- **`docs/adr/`**: leia os ADRs que tocam a área em que você vai mexer.
  Em repos multi-contexto, verifique também `src/<contexto>/docs/adr/`.

Se algum desses arquivos não existir, **siga em silêncio**. Não sinalize a ausência;
não sugira criá-los de antemão. A skill `domain-modeling` (alcançada via
`grill-with-docs` e `improve-codebase-architecture`) cria esses arquivos sob demanda,
quando termos ou decisões realmente forem resolvidos.

## Estrutura de arquivos

Repo single-context (a maioria dos repos):

```
/
├── GLOSSARY.md
├── docs/adr/
│   ├── 0001-event-sourced-orders.md
│   └── 0002-postgres-for-write-model.md
└── src/
```

Repo multi-contexto (presença de `GLOSSARY-MAP.md` na raiz):

```
/
├── GLOSSARY-MAP.md
├── docs/adr/                          ← decisões de sistema
└── src/
    ├── ordering/
    │   ├── GLOSSARY.md
    │   └── docs/adr/                  ← decisões daquele contexto
    └── billing/
        ├── GLOSSARY.md
        └── docs/adr/
```

## Use o vocabulário do glossário

Quando sua saída nomear um conceito de domínio (num título de issue, numa proposta
de refactor, numa hipótese, num nome de teste), use o termo como definido em
`GLOSSARY.md`. Não derive para sinônimos que o glossário evita explicitamente.

Se o conceito de que você precisa ainda não está no glossário, isso é um sinal:
ou você está inventando linguagem que o projeto não usa (reconsidere), ou existe
uma lacuna real (anote para o `domain-modeling`).

## Sinalize conflitos com ADRs

Se sua saída contradiz um ADR existente, exponha isso explicitamente em vez de
sobrescrever em silêncio:

> _Contradiz o ADR-0007 (pedidos event-sourced), mas vale reabrir porque…_
