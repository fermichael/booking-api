# Problemas comuns

[Voltar ao README](../README.md)

## `Configure SESSION_SECRET in .env`

Crie o `.env` na raiz, junto de `package.json`, a partir de `.env.example`. Defina `SESSION_SECRET` e execute o comando novamente nessa pasta. Não envie o segredo em uma issue.

## `ECONNREFUSED`, autenticação do PostgreSQL ou banco inexistente

Confira se o serviço PostgreSQL está iniciado e se `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER` e `PGPASSWORD` correspondem à sua instalação. Conseguir acessar pelo DBeaver não garante que as variáveis do `.env` apontem para a mesma conexão.

Uma tabela existente em outro banco não fica visível automaticamente à API. Na conexão usada para executar SQL, confirme:

```sql
SELECT current_database(), current_schema();
```

O `/health` verifica somente o processo HTTP; ele não confirma a conexão ao banco.

## `relation "users" does not exist`

Em instalação nova, execute `database/schema.sql` inteiro no banco indicado no `.env`. Em um banco antigo com `students`, consulte [a orientação de migration](banco.md). Não reaplique o schema sobre tabelas existentes.

## `relation ... already exists` ao executar o schema

O script é para banco vazio. Se a instalação já está pronta, não precisa executá-lo novamente. Em um editor SQL, uma transação que falhou pode precisar de `ROLLBACK` antes do próximo comando. Inspecione as tabelas existentes antes de alterar qualquer dado.

## `401` depois do login

Confira se o cliente guardou e reenviou o cookie `bookingapi`. Use o mesmo host em todas as chamadas. Login no Postman não autentica automaticamente outro navegador, e alternar `localhost` com `127.0.0.1` pode usar cookies diferentes.

Se o processo foi reiniciado, faça login novamente: as sessões ainda estão em memória.

## A data da resposta aparece três horas à frente

Compare também o fuso. `2030-12-10T14:00:00-03:00` e `2030-12-10T17:00:00.000Z` representam o mesmo instante. A API serializa respostas em UTC.

## `400` ao criar horário

Envie `start` e `end` como strings ISO, com segundos e fuso explícito. Por exemplo, `2030-12-10T14:00:00-03:00`. O fim deve ser posterior ao início, e a data precisa existir no calendário. Não use `inicio`/`fim`, datas sem fuso ou apenas `14h`.

## `409` ao criar horário ou reserva

- Horário: há sobreposição com um intervalo já cadastrado na agenda compartilhada.
- Reserva: o horário já tem uma reserva confirmada ou já começou.

Esses conflitos fazem parte das regras da API. Para descobrir o motivo, leia o campo `message` da resposta. Reenviar uma reserva para um horário já ocupado não deve produzir outra confirmação.

## Falta de permissão para criar schema ao executar testes

A suíte precisa criar um namespace temporário no banco configurado. Use um banco local de desenvolvimento e uma conta autorizada a criar schemas. Não remova o isolamento do teste nem troque o `search_path` para `public` para contornar a permissão.

## Porta 3001 ocupada

Encerre a outra instância que você iniciou e execute `npm run dev` novamente. Os testes usam portas temporárias e não precisam do servidor de desenvolvimento aberto.

## Ao pedir ajuda

Informe o comando ou endpoint, um corpo de exemplo sem credenciais reais, o status recebido e a mensagem do terminal sem dados sensíveis. Não publique `.env`, senha, cookie de sessão ou hash.
