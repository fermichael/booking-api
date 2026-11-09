# Booking API

## Sobre o projeto

Esta é uma API de agendamento de aulas construída com TypeScript, Express e PostgreSQL. O projeto simula uma plataforma em que alunos consultam horários disponíveis e fazem reservas, enquanto professores gerenciam seus próprios horários e acompanham as reservas relacionadas a eles.

O foco principal é controlar autenticação, autorização, propriedade dos dados e conflitos de agenda. A API identifica o usuário pela sessão e usa o banco para preservar contas, horários, reservas e sessões mesmo depois que o servidor é reiniciado.

**Status: em desenvolvimento.** O núcleo da API está implementado e pode ser executado localmente. Ainda faltam funcionalidades de produto, como frontend, recuperação de senha, notificações, pagamentos e preparação para produção.

## Funcionalidades

- Cadastro com email único e hash de senha usando Argon2.
- Login, consulta da conta autenticada e logout.
- Sessões persistidas no PostgreSQL através de `connect-pg-simple`.
- Autorização por papel: `student` e `teacher`.
- Professores criando, consultando, editando e excluindo os próprios horários.
- Bloqueio de sobreposição de horários do mesmo professor no PostgreSQL.
- Consulta de horários futuros disponíveis para alunos.
- Criação e cancelamento de reservas pelo próprio aluno.
- Histórico de reservas canceladas.
- Consulta das reservas do aluno e das reservas relacionadas aos horários do professor.
- Bloqueio de duas reservas confirmadas para o mesmo horário.
- Bloqueio de reservas e cancelamentos depois do início da aula.
- Validação de IDs, datas, intervalos e status.
- Tratamento de erros de JSON inválido, corpo muito grande, rota inexistente e falhas inesperadas.

## Aprendizados deste projeto

Durante o desenvolvimento, pratiquei:

- Organização de uma API Express em routers, controllers, services e middlewares.
- Diferença entre autenticação e autorização.
- Uso de sessões, cookies e armazenamento persistente de sessão.
- Hash e verificação de senhas sem armazená-las em texto puro.
- Modelagem relacional com usuários, papéis, horários e reservas.
- Chaves estrangeiras e histórico de relacionamentos no PostgreSQL.
- Consultas SQL parametrizadas com `pg`.
- Uso de `JOIN`, `EXISTS`, índices parciais e constraints.
- Controle de conflitos de horários com `timestamptz`, `tstzrange` e `btree_gist`.
- Proteção contra reservas simultâneas no banco de dados.
- Validação de dados recebidos por JSON, parâmetros de rota e sessão.
- Uso de códigos HTTP como `400`, `401`, `403`, `404`, `409`, `500` e `204`.
- Criação de migrations para evoluir um banco já existente.
- Separação entre regras de negócio, acesso ao banco e transporte HTTP.

## Tecnologias

| Finalidade | Tecnologias |
| --- | --- |
| Linguagem e execução | TypeScript, Node.js 24 e tsx |
| HTTP | Express 5 |
| Sessões e autenticação | express-session, connect-pg-simple e Argon2 |
| Banco e acesso a dados | PostgreSQL 18 e pg |
| Configuração | dotenv |

## Executar localmente

### Pré-requisitos

- Node.js 24.
- PostgreSQL 18.
- DBeaver, pgAdmin ou `psql`.

Na raiz do projeto:

```powershell
npm ci
Copy-Item .env.example .env
```

Edite o `.env`:

```dotenv
PGHOST=localhost
PGPORT=5432
PGDATABASE=booking_api
PGUSER=postgres
PGPASSWORD=sua_senha_local
SESSION_SECRET=seu_segredo_longo_e_aleatorio
```

Não publique o `.env` nem compartilhe a senha do banco ou o segredo da sessão.

### Preparar o banco

Para uma instalação nova:

1. Crie o banco `booking_api`.
2. Execute `database/schema.sql` na conexão desse banco.
3. Execute `database/migrations/003-persistent-session.sql` para criar a tabela `sessions`.

As migrations `001` e `002` existem para atualizar bancos antigos. Não execute novamente uma migration que já foi aplicada.

O schema cria `users`, `time_slots` e `bookings`. A migration `003` cria `sessions`, usada pelo armazenamento persistente de login.

### Iniciar

```powershell
npm run dev
```

A API estará disponível em `http://localhost:3001`.

Para iniciar sem o modo de observação:

```powershell
npm start
```

Para verificar os tipos TypeScript:

```powershell
npm run typecheck
```

## Rotas principais

| Método | Rota | Acesso | Finalidade |
| --- | --- | --- | --- |
| GET | `/health` | Público | Verifica se a API está funcionando |
| POST | `/users` | Público | Cadastra uma conta `student` |
| POST | `/users/login` | Público | Cria uma sessão |
| GET | `/users/me` | Usuário autenticado | Consulta a conta da sessão |
| POST | `/users/logout` | Público | Encerra a sessão |
| GET | `/time-slots` | Professor | Lista os próprios horários |
| GET | `/time-slots/available` | Público | Lista horários futuros livres |
| GET | `/time-slots/:id` | Público | Consulta um horário |
| GET | `/time-slots/teacher/:id` | Professor | Consulta um horário da própria agenda |
| POST | `/time-slots` | Professor | Cria um horário |
| PATCH | `/time-slots/:id` | Professor | Edita um horário próprio sem reservas confirmadas |
| DELETE | `/time-slots/:id` | Professor | Exclui um horário sem histórico de reservas |
| GET | `/bookings` | Aluno autenticado | Lista as próprias reservas |
| GET | `/teacher/bookings` | Professor autenticado | Lista reservas dos próprios horários |
| POST | `/bookings` | Aluno autenticado | Cria uma reserva |
| PATCH | `/bookings/:bookingId` | Aluno autenticado | Cancela uma própria reserva |

## Exemplo de fluxo

1. Cadastre uma conta com `POST /users`.
2. Faça login em `POST /users/login` e mantenha o cookie `bookingapi`.
3. Para testar funções de professor, atribua o papel no banco:

```sql
UPDATE users
SET role = 'teacher'
WHERE email = 'professor@example.com';
```

4. Faça login novamente com essa conta.
5. Crie um horário futuro em `POST /time-slots`:

```json
{
  "start": "2030-12-10T14:00:00-03:00",
  "end": "2030-12-10T15:00:00-03:00"
}
```

6. Faça login com uma conta `student`.
7. Consulte `GET /time-slots/available`.
8. Reserve com `POST /bookings`:

```json
{
  "timeSlotId": 1
}
```

9. Consulte suas reservas com `GET /bookings`.
10. Cancele uma reserva com `PATCH /bookings/:bookingId`:

```json
{
  "status": "cancelled"
}
```

O usuário é identificado pelo cookie da sessão. Não existe autenticação por token Bearer nesta versão.

## Ainda temos que implementar

- Fluxo seguro de convite ou administração de professores.
- Validação completa e confirmação de email.
- Normalização de emails para evitar duplicação por diferença entre maiúsculas e minúsculas.
- Recuperação de senha e limitação de tentativas de login.
- Frontend para contas, horários e reservas.
- Notificações e lembretes.
- Pagamentos e integrações externas.
- Configuração de produção, HTTPS, observabilidade e publicação online.

## Limitações atuais

- O cadastro público sempre cria contas com papel `student`.
- A sessão usa cookies e possui expiração configurada pelo armazenamento persistente.
- O projeto ainda não possui frontend.
- Não há suíte automatizada de testes nesta versão.
- O banco e a API ainda são executados localmente.

## Dúvidas e contribuições

Ao abrir uma issue, informe o endpoint, o corpo enviado sem credenciais reais, o status recebido, a mensagem do terminal e as versões de Node.js e PostgreSQL.

Nunca publique `.env`, senhas, cookies de sessão ou hashes de senha.
