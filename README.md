# Booking API

## Sobre o projeto

A Booking API é o backend de uma plataforma de agendamento de aulas. O projeto começou como um estudo de TypeScript, Express e PostgreSQL e evoluiu para uma base funcional de SaaS.

A aplicação conecta professores, estudantes, horários e reservas, controlando autenticação, autorização, disponibilidade e conflitos de agenda.

O objetivo é construir gradualmente uma solução em que:

- professores administrem suas próprias agendas;
- estudantes encontrem horários disponíveis;
- reservas não sejam duplicadas;
- usuários só acessem recursos permitidos;
- o banco também ajude a proteger as regras do sistema.

## Status

Em desenvolvimento.

O fluxo principal já está implementado:

- cadastro e login;
- sessões autenticadas;
- contas student e teacher;
- criação de horários por professores;
- agendas separadas por professor;
- consulta de horários disponíveis;
- criação e cancelamento de reservas;
- edição de horários sem reserva confirmada;
- bloqueio de conflitos no PostgreSQL.

Ainda faltam funcionalidades como exclusão de horários, consulta de reservas pelos professores, frontend, notificações e publicação em produção.

## Como o sistema funciona

Professor cria um horário. Estudante consulta os horários livres. Estudante faz uma reserva. A API associa a reserva ao estudante e ao horário escolhido.

A aplicação verifica:

- se o usuário está autenticado;
- se ele tem permissão para realizar a ação;
- se o horário pertence ao professor correto;
- se o horário ainda está disponível;
- se existe conflito com outro horário;
- se a aula já começou.

## Funcionalidades

### Usuários

- Cadastro com email único.
- Hash de senha com Argon2.
- Login, logout e sessão por cookie.
- Consulta do usuário autenticado.
- Papéis student e teacher.

### Horários

- Criação por professores.
- Listagem da agenda própria.
- Consulta de horários disponíveis.
- Atualização pelo professor responsável.
- Validação de datas.
- Bloqueio de horários sobrepostos.
- Bloqueio de edição quando existe reserva confirmada.

### Reservas

- Criação por estudantes.
- Uma reserva confirmada por horário.
- Consulta das próprias reservas.
- Cancelamento pelo estudante responsável.
- Preservação do histórico.
- Bloqueio de reservas e cancelamentos após o início da aula.

## Tecnologias

| Área | Tecnologias |
|---|---|
| Linguagem | TypeScript |
| Runtime | Node.js |
| HTTP | Express |
| Banco de dados | PostgreSQL |
| Sessões | express-session |
| Hash de senha | Argon2 |
| Configuração | dotenv |
| Testes | node:test, assert e fetch |

## Organização

O projeto separa responsabilidades entre rotas, controllers, services e middlewares.

- Rotas definem os endpoints.
- Controllers recebem requisições e enviam respostas.
- Services executam regras de negócio e consultas SQL.
- Middlewares verificam autenticação e autorização.
- PostgreSQL mantém os dados e aplica restrições de integridade.

## Executar localmente

Instale as dependências com npm ci.

Configure o arquivo .env com as credenciais do PostgreSQL e um SESSION_SECRET.

Crie o banco booking_api e execute o arquivo database/schema.sql.

Inicie a aplicação com npm run dev.

A API ficará disponível em http://localhost:3001.

Para verificar se está funcionando, acesse GET /health.

## Exemplo de fluxo

1. Criar uma conta em POST /users.
2. Definir o papel teacher para uma conta de professor.
3. Fazer login em POST /users/login.
4. Criar um horário em POST /time-slots.
5. Fazer login com um estudante.
6. Consultar GET /time-slots/available.
7. Criar uma reserva em POST /bookings.
8. Consultar as reservas em GET /bookings.
9. Cancelar uma reserva em PATCH /bookings/:bookingId.

## Ainda temos que implementar

- Exclusão de horários pelo professor.
- Consulta de reservas relacionadas aos horários do professor.
- Sessões persistentes no banco.
- Confirmação e normalização de emails.
- Recuperação de senha.
- Limitação de tentativas de login.
- Frontend para estudantes e professores.
- Notificações.
- Pagamentos.
- Integrações externas.
- Configuração e publicação em produção.

## Limitações atuais

- A sessão ainda usa o MemoryStore.
- O cadastro público cria contas como student.
- A promoção para teacher ainda é manual.
- Não existe frontend.
- A aplicação ainda não está publicada em produção.

## Documentação

- Referência da API (docs/api.md)
- Arquitetura (docs/arquitetura.md)
- Banco de dados (docs/banco.md)
- [Validação]
