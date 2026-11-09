# Booking API

## Sobre o projeto

Criei esta API para praticar desenvolvimento backend com TypeScript, Express e PostgreSQL, usando uma agenda de aulas como problema real. Ela permite consultar disponibilidade, reservar horários e cancelar as próprias reservas, preservando o histórico.

Meu foco foi evitar que duas pessoas reservem o mesmo horário e garantir que cada conta só acesse suas próprias reservas. Para isso, implementei as verificações na API e as restrições de conflito no banco, incluindo proteção para requisições simultâneas.

**Status: em desenvolvimento.** O fluxo de cadastro, login, reservas e a separação de horários por professor já está implementado e pode ser executado localmente. Ainda temos que implementar as funcionalidades necessárias para evoluir esta base para o SaaS de agendamento. A criação e a consulta da agenda própria exigem uma conta autenticada com papel de professor; a disponibilidade continua compartilhada para os alunos.

## Navegação

- [Funcionalidades](#funcionalidades)
- [Tecnologias](#tecnologias)
- [Executar localmente](#executar-localmente)
- [Exemplo de uso](#exemplo-de-uso)
- [Ainda temos que implementar](#ainda-temos-que-implementar)
- [Dúvidas e contribuições](#dúvidas-e-contribuições)

## Funcionalidades

- Cadastro com email único e hash de senha com Argon2.
- Login, consulta da conta autenticada e logout por sessão.
- Sessões armazenadas no PostgreSQL, permitindo manter o login após reiniciar a API.
- Criação e consulta dos próprios horários por professores, com bloqueio de sobreposição por professor.
- Edição e exclusão de horários pelo professor responsável, preservando horários que já possuem reservas.
- Autorização por papel, com contas `student` e `teacher`.
- Disponibilidade baseada em horários futuros sem reserva confirmada.
- Reserva e cancelamento restritos ao dono, com histórico e possibilidade de nova reserva após cancelar.
- Consulta das reservas próprias pelo aluno e das reservas relacionadas aos horários pelo professor.
- Bloqueio de novas reservas e de cancelamento de reservas confirmadas após o início da aula.
- Proteções de concorrência no PostgreSQL.

## Aprendizados deste projeto

Este projeto consolidou conhecimentos práticos de desenvolvimento backend, desde o recebimento de uma requisição até a persistência dos dados:

- Organização de uma API Express em routers, controllers, services e middlewares.
- Separação entre autenticação, autorização e regras de negócio.
- Uso de sessões e cookies para manter o usuário identificado entre requisições.
- Hash e verificação de senhas com Argon2, sem armazenar senhas em texto puro.
- Modelagem relacional com chaves estrangeiras, papéis de usuário e histórico de reservas.
- Consultas SQL parametrizadas com `pg`, evitando interpolação direta de valores.
- Uso de transações conceituais entre validações da API e garantias do PostgreSQL.
- Controle de conflitos de horários com `timestamptz`, `tstzrange` e restrições de exclusão.
- Controle de concorrência para impedir duas reservas confirmadas no mesmo horário.
- Validação de IDs, datas, intervalos, status e dados recebidos em JSON.
- Uso consciente de códigos HTTP, como `400`, `401`, `403`, `404`, `409`, `500` e `204`.
- Evolução de um schema por migrations e distinção entre instalação nova e banco já existente.
- Tratamento centralizado de JSON inválido, rotas inexistentes e erros inesperados.

## Tecnologias

| Finalidade           | Tecnologias                         |
| -------------------- | ----------------------------------- |
| Linguagem e execução | TypeScript, Node.js 24 e tsx        |
| HTTP e autenticação  | Express 5, express-session, connect-pg-simple e Argon2 |
| Banco e configuração | PostgreSQL 18, pg e dotenv                            |

## Executar localmente

### 1. Pré-requisitos

- Node.js 24, versão verificada neste projeto.
- PostgreSQL 18, versão usada no desenvolvimento.
- DBeaver, pgAdmin ou `psql` para executar os scripts SQL.

Baixe ou clone este repositório e abra um terminal na pasta que contém `package.json`. Os comandos abaixo usam PowerShell no Windows.

Na raiz do projeto:

```powershell
npm ci
if (-not (Test-Path .env)) {
  Copy-Item .env.example .env
}
```

Se o `.env` já existir, edite-o em vez de sobrescrevê-lo. Ele deve conter:

```dotenv
PGHOST=localhost
PGPORT=5432
PGDATABASE=booking_api
PGUSER=postgres
PGPASSWORD=sua_senha_local
SESSION_SECRET=seu_segredo_longo_e_aleatorio
```

Para gerar um segredo:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Copie o resultado para `SESSION_SECRET`. O `.env` está no `.gitignore`; `.env.example` contém somente exemplos.

### 2. Preparar o banco

Se o banco deste projeto já estiver configurado com as tabelas e restrições atuais, pule esta etapa. As instruções abaixo são para uma instalação nova.

Conectado a outro banco, como `postgres`, execute:

```sql
CREATE DATABASE booking_api;
```

Abra uma conexão para `booking_api` e execute **todo o arquivo** [database/schema.sql](database/schema.sql). Ele habilita a extensão `btree_gist`, cria as três tabelas principais e as proteções de conflito.

Se você tiver `psql` no PATH, a alternativa é:

```powershell
psql -h localhost -p 5432 -U postgres -d booking_api -f database/schema.sql
```

O script é para **banco vazio**: não o execute novamente sobre tabelas existentes. Ele não apaga nem recria dados automaticamente.

Depois do schema, execute também `database/migrations/003-persistent-session.sql` para criar a tabela `sessions`, usada pelo armazenamento persistente de login. Em um banco antigo, aplique somente as migrations necessárias, respeitando a ordem indicada pelos nomes dos arquivos. Não reaplique migrations que já foram executadas.

### 3. Iniciar

```powershell
npm run dev
```

A API responde em `http://localhost:3001`. Para executar sem observar alterações:

```powershell
npm start
```

O código TypeScript é executado pelo tsx; não há etapa de build nesta versão local.

### 4. Confirmar a execução

No navegador ou Postman, consulte:

```http
GET http://localhost:3001/health
```

Resposta esperada: `200 OK`.

```json
{
  "message": "Running"
}
```

Esse endpoint verifica o processo HTTP; não consulta o banco. Para exercitar persistência e autenticação, siga o fluxo abaixo.

## Exemplo de uso

Com a API em execução, use o Postman nesta sequência:

1. `POST /users`: cadastre uma conta com `name`, `email` e `password`.
2. `POST /users/login`: envie `email` e `password` e mantenha o cookie recebido. A sessão é registrada na tabela `sessions`.
3. Com uma conta cujo papel seja `teacher`, `POST /time-slots`: crie um intervalo futuro com `start` e `end`, incluindo fuso horário.
4. `GET /time-slots/available`: confira os horários livres.
5. `POST /bookings`: envie `{ "timeSlotId": 1 }`, substituindo `1` pelo ID criado.
6. `GET /bookings`: consulte suas reservas.
7. `PATCH /bookings/:bookingId`: envie `{ "status": "cancelled" }` para cancelar a reserva criada.
8. `POST /users/logout`: encerre a sessão.

O cliente é identificado pelo cookie; não há token Bearer. As sessões são armazenadas no PostgreSQL e possuem expiração. As principais regras de validação e respostas estão descritas neste README.

O cadastro público cria contas com papel `student`; o corpo de `POST /users` não pode promover uma conta. Para testar a criação de horários, atribua manualmente o papel de professor no banco a uma conta cadastrada e faça login novamente:

```sql
UPDATE users
SET role = 'teacher'
WHERE email = 'professor@example.com';
```

## Ainda temos que implementar

- **Tratamento de email:** validar o formato, confirmar o endereço e impedir duplicação por diferença entre maiúsculas e minúsculas.
- **Recuperação de senha e proteção de acesso:** implementar redefinição segura e limites para tentativas de login.
- **Gestão de professores:** criar um fluxo seguro de convite ou administração para conceder o papel `teacher`, em vez da alteração manual no banco.
- **Frontend:** criar as telas de conta, disponibilidade, reservas e administração da agenda.
- **Pagamentos, notificações e integração externa:** definir as regras e implementar os serviços escolhidos.
- **Configuração de produção e publicação:** preparar execução, segredos, HTTPS e operação do sistema online.

Essas funcionalidades fazem parte da continuação do projeto. O núcleo da API está implementado, mas o SaaS ainda precisa de interface e operação de produção.

## Dúvidas e contribuições

Ao abrir uma issue neste repositório, descreva os passos para reproduzir, o resultado esperado, o resultado recebido e as versões de Node.js e PostgreSQL. Não inclua `.env`, senhas, cookies ou hashes de senha.

Para propor uma mudança, explique o problema e como verificou a solução. Antes de enviar, execute `npm run typecheck`.
