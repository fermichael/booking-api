# Issue tracker: Markdown local

Specs e tickets deste repo vivem como arquivos markdown em `.scratch/`.

## Convenções

- Uma feature por diretório: `.scratch/<slug-da-feature>/`
- A spec é `.scratch/<slug-da-feature>/spec.md`
- As issues de implementação são um arquivo por ticket em
  `.scratch/<slug-da-feature>/issues/<NN>-<slug>.md`, numerados a partir de `01`,
  nunca um arquivo único com todos os tickets
- O estado de triage é registrado numa linha `Status:` perto do topo de cada arquivo
  de issue, usando um destes valores: `needs-triage`, `needs-info`, `ready-for-agent`,
  `ready-for-human`, `wontfix`
- Comentários e histórico de conversa são anexados ao final do arquivo, sob o título `## Comments`

## Quando uma skill disser "publique no issue tracker"

Crie um novo arquivo em `.scratch/<slug-da-feature>/` (criando o diretório se necessário).

## Quando uma skill disser "busque o ticket relevante"

Leia o arquivo no caminho indicado. Normalmente o usuário passa o caminho ou o número da issue diretamente.

## Wayfinding

Usado pelo `wayfinder`, quando estiver instalado. O **mapa** é um arquivo com um **arquivo filho** por ticket.

- **Mapa**: `.scratch/<esforço>/map.md` (o corpo com Notes / Decisions-so-far / Fog)
- **Ticket filho**: `.scratch/<esforço>/issues/NN-<slug>.md`, numerado a partir de `01`, com a pergunta no corpo.
  Uma linha `Type:` registra o tipo (`research`/`prototype`/`grilling`/`task`);
  uma linha `Status:` registra `claimed`/`resolved`
- **Bloqueio**: uma linha `Blocked by: NN, NN` perto do topo. O ticket está desbloqueado
  quando todos os arquivos listados estão `resolved`
- **Fronteira**: varra `.scratch/<esforço>/issues/` procurando arquivos abertos,
  desbloqueados e não reivindicados; o de menor número vence
- **Reivindicar**: defina `Status: claimed` e salve antes de qualquer trabalho
- **Resolver**: anexe a resposta sob o título `## Answer`, defina `Status: resolved`,
  e acrescente um ponteiro de contexto (resumo + link) ao "Decisions so far" do `map.md`
