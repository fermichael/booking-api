# Booking API

## Sobre o projeto

Esta é uma API de agendamento de aulas construída com TypeScript, Express e PostgreSQL. O projeto simula uma plataforma em que alunos consultam horários disponíveis e fazem reservas, enquanto professores gerenciam seus próprios horários e acompanham as reservas relacionadas a eles.

O foco principal é controlar autenticação, autorização, propriedade dos dados e conflitos de agenda. A API identifica o usuário pela sessão e usa o banco para preservar contas, horários, reservas e sessões mesmo depois que o servidor é reiniciado.

**Status: em desenvolvimento.** O núcleo da API está implementado e pode ser executado localmente. Ainda faltam funcionalidades de produto, como confirmação de email, notificações, pagamentos e preparação para produção.

## Resultado alcançado

Ao final desta etapa, a aplicação consegue executar localmente o fluxo principal de uma plataforma de agendamento:

- usuários podem criar conta, fazer login e encerrar a sessão;
- sessões continuam válidas depois que a API é reiniciada, porque são armazenadas no PostgreSQL;
- usuários podem recuperar a senha por email, com link de uso único que expira em 30 minutos e revoga as sessões abertas;
- professores podem administrar os próprios horários;
- a disponibilidade é pública; usuários autenticados podem reservar e cancelar horários;
- o banco impede sobreposição de horários e duas reservas confirmadas para o mesmo intervalo;
- a integração de envio de emails através do Resend foi configurada e validada separadamente.

O resultado é uma base funcional de backend para um SaaS de agendamento, executada localmente.

## O que mudou nesta etapa

Comparação com o estado anterior do projeto.

| Antes | Agora |
| --- | --- |
| Conta com senha esquecida ficava inacessível para sempre | Fluxo de recuperação por email, com token de uso único que expira em 30 minutos |
| Nenhum caminho para expulsar sessões abertas depois de uma senha comprometida | A troca de senha revoga todas as sessões da conta |
| Dois pedidos simultâneos podiam deixar dois links válidos | O banco garante no máximo um token ativo por usuário |
| Token de recuperação trafegando na query da URL | Token no fragmento (`#token=`), que não é enviado ao servidor nem entra em `Referer` |
| Banco reconstruído por migrations soltas, com nomes herdados de `students` | `schema.sql` como snapshot completo e migrations `001`–`007` documentadas |
| Recurso de senha sem contrato escrito | Spec e tickets em `.scratch/password-recovery/`, com os critérios de aceite marcados |

## Funcionalidades

- Cadastro com email único e hash de senha usando Argon2.
- Emails são normalizados para minúsculas e a unicidade não diferencia maiúsculas de minúsculas.
- Login, consulta da conta autenticada e logout.
- Recuperação de senha por email, com token opaco de uso único que expira em 30 minutos.
- Apenas um link ativo por usuário; pedir outro invalida o anterior.
- A troca de senha encerra todas as sessões da conta e não autentica automaticamente.
- Token expirado, já usado ou adulterado recebe a mesma resposta genérica.
- Sessões persistidas no PostgreSQL através de `connect-pg-simple`.
- Sessão por cookie `httpOnly` com `sameSite=lax`, regenerada no login e destruída no logout.
- A sessão expira após 1 dia no armazenamento (padrão do `connect-pg-simple`).
- Autorização por papel: `student` e `teacher`.
- Professores criando, consultando, editando e excluindo os próprios horários.
- Bloqueio de sobreposição de horários do mesmo professor no PostgreSQL.
- Consulta pública de horários futuros disponíveis, sem exigir sessão.
- Criação e cancelamento de reservas pelo próprio usuário da sessão.
- Cancelamento idempotente: repetir o cancelamento responde `200` e não altera o histórico.
- Consulta das reservas do próprio usuário e das reservas relacionadas aos horários do professor.
- Bloqueio de duas reservas confirmadas para o mesmo horário.
- Bloqueio de reservas e cancelamentos depois do início da aula.
- Validação de IDs, datas, intervalos e status.
- Validação básica do formato de email antes do acesso ao banco.
- Tratamento de erros de JSON inválido, corpo muito grande, rota inexistente e falhas inesperadas.

## Aprendizados deste projeto

Durante o desenvolvimento, pratiquei:

- Organização de uma API Express em routers, controllers, services e middlewares.
- Diferença entre autenticação e autorização.
- Uso de sessões, cookies e armazenamento persistente de sessão.
- Hash e verificação de senhas sem armazená-las em texto puro.
- Geração de tokens opacos, armazenamento apenas do hash e expiração.
- Transações e atualização condicional para consumir token sem corrida.
- Índices únicos parciais como invariante de domínio no banco.
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
| Email | Resend |
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
APP_URL=http://localhost:3001
RESEND_API_KEY=
RESEND_FROM_EMAIL=onboarding@resend.dev
```

Não publique o `.env` nem compartilhe a senha do banco ou o segredo da sessão.

### Preparar o banco

Para uma instalação nova:

1. Crie o banco `booking_api`.
2. Execute `database/schema.sql` na conexão desse banco.

O snapshot cria `users`, `time_slots`, `bookings`, `sessions` e `password_reset_tokens`, com os índices e constraints do estado atual.

Para atualizar um banco que já existe, execute as migrations uma única vez, em ordem:

| Migration | O que muda |
| --- | --- |
| `001_rename_students_to_users` | Renomeia `students` para `users` |
| `002-teacher-owned-time-slots` | Torna `teacher_id` obrigatório e bloqueia sobreposição por professor |
| `003-persistent-session` | Cria a tabela `sessions` |
| `004-case-insensitive-user-email` | Normaliza emails e protege a unicidade sem diferenciar maiúsculas |
| `005-password-reset-tokens` | Cria a tabela `password_reset_tokens` |
| `006-one-active-password-reset-token` | Garante um único token ativo por usuário |
| `007-reconcile-users-schema` | Renomeia constraints e sequence herdadas e cria o índice de email em minúsculas |

Não execute novamente uma migration que já foi aplicada.

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
| GET | `/users/me` | Usuário autenticado | Consulta id, nome, email e papel do usuário da sessão |
| POST | `/users/logout` | Público | Encerra a sessão |
| POST | `/users/forgot-password` | Público | Envia o link de recuperação, com resposta genérica |
| POST | `/users/reset-password` | Público | Define a nova senha usando o token |
| GET | `/time-slots` | Professor | Lista os próprios horários |
| GET | `/time-slots/available` | Público | Lista horários futuros livres |
| GET | `/time-slots/:id` | Público | Consulta um horário |
| GET | `/time-slots/teacher/:id` | Professor | Consulta um horário da própria agenda |
| POST | `/time-slots` | Professor | Cria um horário |
| PATCH | `/time-slots/:id` | Professor | Edita um horário próprio sem reservas confirmadas |
| DELETE | `/time-slots/:id` | Professor | Exclui um horário sem histórico de reservas |
| GET | `/bookings` | Usuário autenticado | Lista as próprias reservas |
| GET | `/teacher/bookings` | Professor autenticado | Lista reservas dos próprios horários |
| POST | `/bookings` | Usuário autenticado | Cria uma reserva |
| PATCH | `/bookings/:bookingId` | Usuário autenticado | Cancela uma própria reserva |

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

## Recuperar a senha

1. Peça o link com `POST /users/forgot-password`:

```json
{
  "email": "aluno@example.com"
}
```

A resposta é `202` exista ou não a conta. Email vazio ou malformado responde `400`.

2. Copie o token do link recebido por email: `.../reset-password#token=...`. O banco guarda apenas o hash SHA-256, então o token não pode ser lido por consulta ao banco.

3. Envie o token e a nova senha para `POST /users/reset-password`:

```json
{
  "token": "...",
  "password": "nova-senha"
}
```

4. A resposta é `204`. A senha antiga deixa de autenticar, a nova autentica, todas as sessões abertas da conta são encerradas e a pessoa não fica logada.

5. Repetir o mesmo token responde `400` com `Invalid or expired token`, igual a um token expirado, já usado ou adulterado.

A página `/reset-password` ainda não existe; enquanto o frontend não chega, o link abre 404 e o token é copiado da URL. O rate limit do pedido de recuperação também ainda não existe — está planejado para depois da publicação, em "Próximos passos".

## Próximos passos

A ordem é a planejada. Cada linha é independente das outras, exceto onde indicado.

| Quando | O que entra |
| --- | --- |
| **Agora** | Suíte de testes mínima — hoje a única verificação automática é o `npm run typecheck`. Correções de robustez: tempo de resposta do login (hoje um email inexistente responde mais rápido que um existente), corrida ao editar um horário com reserva confirmada, papel do usuário nas rotas de reserva, validações duplicadas. |
| **Antes de publicar** | Configuração de produção: HTTPS, cookie `secure`, `trust proxy`, observabilidade e publicação online. |
| **Depois de publicar** | Limitação de tentativas no login e no pedido de recuperação de senha. Adiada por decisão: os números do limite e a camada por IP dependem de `trust proxy` e de quantas instâncias existirem. |
| **Sem previsão** | Página de reset de senha consumindo o token do fragmento, fluxo de convite ou administração de professores, validação de email mais completa e confirmação de email, notificações e lembretes, pagamentos e integrações externas, frontend completo. |

## Limitações atuais

- O cadastro público sempre cria contas com papel `student`.
- O cookie de sessão não define `secure` e não há `trust proxy`, então o uso atual é HTTP local.
- As rotas de reserva exigem sessão, mas não exigem papel `student`: um professor autenticado também consegue reservar um horário. Restringir o papel está em "Próximos passos".
- Não há frontend neste repositório; o uso atual é feito por Postman ou outro cliente HTTP.
- O link de recuperação aponta para `/reset-password`, que ainda não existe; até o frontend, o teste é feito por cliente HTTP copiando o token da URL.
- O token de recuperação só existe no email; o banco guarda apenas o hash.
- Se o envio do email falhar, `POST /users/forgot-password` ainda responde `202` e o token fica ativo até expirar; a falha só aparece no log.
- Não há suíte automatizada de testes nesta versão.
- O banco e a API ainda são executados localmente.

## Dúvidas e contribuições

Ao abrir uma issue, informe o endpoint, o corpo enviado sem credenciais reais, o status recebido, a mensagem do terminal e as versões de Node.js e PostgreSQL.

Nunca publique `.env`, senhas, cookies de sessão ou hashes de senha.
