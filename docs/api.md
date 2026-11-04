# Referência da API

[Voltar ao README](../README.md)

## Convenções

- URL base local: `http://localhost:3001`.
- Envie corpos JSON com `Content-Type: application/json`.
- IDs de recurso são inteiros de `1` a `2147483647`.
- IDs e datas dos exemplos são ilustrativos; use os valores efetivamente criados.
- As rotas não possuem prefixo de versão como `/v1`.

## Autenticação

Após `POST /users/login`, preserve o cookie `bookingapi` e envie-o nas rotas protegidas. O Postman pode fazer isso automaticamente. O cookie tem `HttpOnly` e `SameSite=Lax`; a demonstração local usa HTTP. Não há token Bearer.

Use o mesmo host em todas as requisições, por exemplo `localhost`. Trocar para `127.0.0.1` pode fazer o cliente usar outro conjunto de cookies. Reiniciar o processo invalida as sessões em memória; faça login novamente.

## Endpoints

| Método | Caminho                 | Exige login | Resultado principal                                         |
| ------ | ----------------------- | ----------- | ----------------------------------------------------------- |
| GET    | `/health`               | Não         | `200`, processo em execução; não testa o banco              |
| POST   | `/users`                | Não         | `201`, conta criada; `409`, email existente                 |
| POST   | `/users/login`          | Não         | `200`, sessão criada; `401`, credenciais inválidas          |
| GET    | `/users/me`             | Sim         | `200`, ID numérico da conta                                 |
| POST   | `/users/logout`         | Não         | `204`, sessão encerrada; pode repetir                       |
| GET    | `/time-slots`           | Não         | `200`, todos os horários                                    |
| GET    | `/time-slots/available` | Não         | `200`, futuros sem reserva confirmada                       |
| GET    | `/time-slots/:id`       | Não         | `200`, horário; `404`, inexistente                          |
| POST   | `/time-slots`           | Não         | `201`, horário criado; `409`, sobreposição                  |
| GET    | `/bookings`             | Sim         | `200`, lista das próprias reservas                          |
| POST   | `/bookings`             | Sim         | `201`, reserva criada; `409`, ocupado ou iniciado           |
| PATCH  | `/bookings/:bookingId`  | Sim         | `200`, cancelamento; `404`, inexistente ou de outro usuário |

Listas vazias retornam `200` com `[]`. Campos inválidos retornam `400`. Falhas inesperadas retornam `500` com uma mensagem genérica; detalhes ficam no terminal. Os IDs são inteiros positivos de 32 bits, compatíveis com `SERIAL`/`INTEGER`.

### Cadastro

```http
POST /users
Content-Type: application/json
```

```json
{
  "name": "Ana",
  "email": "ana@example.com",
  "password": "senha-de-estudo-123"
}
```

A resposta contém somente `id`, `name` e `email`. A senha não é aparada: espaços digitados fazem parte dela, embora senhas compostas apenas de espaços sejam rejeitadas.

### Login e cookie

```http
POST /users/login
Content-Type: application/json
```

```json
{
  "email": "ana@example.com",
  "password": "senha-de-estudo-123"
}
```

O login devolve `Set-Cookie` para `bookingapi`, com `HttpOnly` e `SameSite=Lax`. O Postman deve manter e reenviar o cookie nas próximas requisições ao mesmo host. Use sempre `localhost`, sem alternar com `127.0.0.1`. Não há token Bearer. `GET /users/me` responde com um número, por exemplo `4`.

### Criar um horário

```http
POST /time-slots
Content-Type: application/json
```

```json
{
  "start": "2030-12-10T14:00:00-03:00",
  "end": "2030-12-10T15:00:00-03:00"
}
```

Escolha uma data futura para testar reservas. São aceitas datas ISO com segundos, fuso explícito (`Z` ou deslocamento até ±14h) e até três casas de milissegundos. Datas inexistentes e fim menor ou igual ao início são recusados. Datas sem fuso são rejeitadas para evitar ambiguidade. As respostas serializam as datas em UTC: 14h no fuso −03:00 aparece como 17h com `Z`.

### Reservar

```http
POST /bookings
Content-Type: application/json
```

```json
{
  "timeSlotId": 1
}
```

O ID deve ser numérico, sem aspas. O dono é obtido da sessão; valores `studentId` ou `userId` enviados no corpo não escolhem outra pessoa. A resposta contém `bookingId`, `studentId`, `timeSlotId` e `status`.

### Cancelar

```http
PATCH /bookings/1
Content-Type: application/json
```

```json
{
  "status": "cancelled"
}
```

Só o dono pode cancelar. O cancelamento altera o registro e preserva o histórico. Uma reserva já cancelada responde `200` com `"Booking is already cancelled"`. Uma reserva confirmada cuja aula já começou responde `409`.

## Exemplos de respostas

### Conta criada

`POST /users` responde `201`:

```json
{
  "id": 4,
  "name": "Ana",
  "email": "ana@example.com"
}
```

Nome e email têm espaços externos removidos. O email é único por igualdade exata; não há conversão automática para minúsculas. O cadastro não devolve senha, hash ou papel. Um `role` enviado no corpo não promove a conta.

### Login e conta atual

`POST /users/login` responde `200`, além de enviar o cabeçalho `Set-Cookie`:

```json
{
  "message": "Credentials verified"
}
```

`GET /users/me` responde `200` com **um número**, não um objeto:

```json
4
```

### Horário criado ou consultado

`POST /time-slots` responde `201`; `GET /time-slots/:id` responde `200` com o mesmo formato:

```json
{
  "id": 2,
  "start": "2030-12-10T17:00:00.000Z",
  "end": "2030-12-10T18:00:00.000Z"
}
```

As listagens de horários respondem com um array desse tipo de objeto. A disponibilidade inclui somente horários futuros sem reserva confirmada. Um histórico de reservas canceladas não ocupa o horário.

### Reserva criada ou cancelada

`POST /bookings` responde `201`:

```json
{
  "bookingId": 7,
  "studentId": 4,
  "timeSlotId": 2,
  "status": "confirmed"
}
```

Ao cancelar com `PATCH /bookings/7`, a resposta `200` tem o mesmo formato, com `status` igual a `"cancelled"`. Ao repetir o cancelamento, o formato é diferente:

```json
{
  "message": "Booking is already cancelled"
}
```

`GET /bookings` responde com um array das reservas da conta, incluindo canceladas, ordenado por ID. Nunca lista as de outro usuário.

### Logout

`POST /users/logout` responde `204` **sem corpo** e limpa o cookie. Pode ser chamado mesmo sem sessão autenticada.

## Erros por operação

Todas as mensagens de erro têm formato JSON:

```json
{
  "message": "Time slot not found"
}
```

| Operação                                    | Status esperados além do sucesso                                                                                                         |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /users`                               | `400` campos inválidos; `409` email existente; `500` falha inesperada                                                                    |
| `POST /users/login`                         | `400` campos inválidos; `401` email ou senha incorretos; `500` falha inesperada                                                          |
| `GET /users/me`                             | `401` sem login                                                                                                                          |
| `POST /users/logout`                        | `500` falha ao encerrar sessão                                                                                                           |
| `GET /time-slots` e `/time-slots/available` | `500` falha na consulta                                                                                                                  |
| `GET /time-slots/:id`                       | `400` ID inválido; `404` inexistente; `500` falha na consulta                                                                            |
| `POST /time-slots`                          | `400` campos, datas ou intervalo inválidos; `409` sobreposição; `500` falha inesperada                                                   |
| `GET /bookings`                             | `401` sem login; `500` falha na consulta                                                                                                 |
| `POST /bookings`                            | `400` ID inválido; `401` sem login; `404` horário inexistente; `409` ocupado ou iniciado; `500` falha inesperada                         |
| `PATCH /bookings/:bookingId`                | `400` ID ou status inválido; `401` sem login; `404` reserva inexistente ou de outro usuário; `409` aula iniciada; `500` falha inesperada |

JSON malformado retorna `400`. Corpos acima do limite padrão do parser JSON do Express retornam `413`. Uma rota inexistente retorna `404` com `"Route not found"`. Detalhes internos de falhas ficam no terminal, não no corpo da resposta.

## Regras dos campos

| Campo                    | Regra                                                                                                 |
| ------------------------ | ----------------------------------------------------------------------------------------------------- |
| `name`                   | Texto não vazio e não composto apenas de espaços                                                      |
| `email`                  | Texto não vazio; unicidade sensível a maiúsculas; sem validação completa de formato                   |
| `password`               | Texto não vazio e não composto apenas de espaços; espaços externos fazem parte da senha               |
| `start`, `end`           | Data/hora ISO com segundos, fuso explícito e até três casas de milissegundos; fim posterior ao início |
| `timeSlotId` no corpo    | Número inteiro positivo de 32 bits; strings como `"2"` são recusadas                                  |
| `status` no cancelamento | Exatamente `"cancelled"`                                                                              |

Filtros por query string, paginação e edição de reserva não fazem parte dos endpoints atuais. Ainda temos que implementar a administração de horários por professor e as sessões persistentes; consulte [as próximas funcionalidades](../README.md#ainda-temos-que-implementar).
