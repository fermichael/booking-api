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

## Navegação

- [Funcionalidades](#funcionalidades)
- [Tecnologias](#tecnologias)
- [Executar localmente](#executar-localmente)
- [Exemplo de uso](#exemplo-de-uso)
- [Testes](#testes)
- [Documentação](#documentação)
- [Ainda temos que implementar](#ainda-temos-que-implementar)
- [Dúvidas e contribuições](#dúvidas-e-contribuições)

## Funcionalidades

- Cadastro com email único e hash de senha com Argon2.
- Login, consulta da conta autenticada e logout por sessão.
- Criação e consulta dos próprios horários por professores, com bloqueio de sobreposição por professor.
- Autorização por papel, com contas `student` e `teacher`.
- Disponibilidade baseada em horários futuros sem reserva confirmada.
- Reserva e cancelamento restritos ao dono, com histórico e possibilidade de nova reserva após cancelar.
- Bloqueio de novas reservas e de cancelamento de reservas confirmadas após o início da aula.
- Proteções de concorrência no PostgreSQL e testes HTTP integrados.

## Tecnologias

| Finalidade           | Tecnologias                         |
| -------------------- | ----------------------------------- |
| Linguagem e execução | TypeScript, Node.js 24 e tsx        |
| HTTP e autenticação  | Express 5, express-session e Argon2 |
| Banco e configuração | PostgreSQL 18, pg e dotenv          |
| Testes               | node:test, assert e fetch |

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

Abra uma conexão para `booking_api` e execute **todo o arquivo** [database/schema.sql](database/schema.sql). Ele habilita a extensão `btree_gist`, cria as três tabelas e as proteções de conflito.

Se você tiver `psql` no PATH, a alternativa é:

```powershell
psql -h localhost -p 5432 -U postgres -d booking_api -f database/schema.sql
```

O script é para **banco vazio**: não o execute novamente sobre tabelas existentes. Ele não apaga nem recria dados automaticamente.

Para atualizar um banco antigo, consulte [a documentação do banco](docs/banco.md).

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
2. `POST /users/login`: envie `email` e `password` e mantenha o cookie recebido.
3. Com uma conta cujo papel seja `teacher`, `POST /time-slots`: crie um intervalo futuro com `start` e `end`, incluindo fuso horário.
4. `GET /time-slots/available`: confira os horários livres.
5. `POST /bookings`: envie `{ "timeSlotId": 1 }`, substituindo `1` pelo ID criado.
6. `GET /bookings`: consulte suas reservas.
7. `PATCH /bookings/:bookingId`: envie `{ "status": "cancelled" }` para cancelar a reserva criada.
8. `POST /users/logout`: encerre a sessão.

Os corpos completos, exemplos de respostas, regras de validação e erros estão na [referência da API](docs/api.md). O cliente é identificado pelo cookie; não há token Bearer.

O cadastro público cria contas com papel `student`; o corpo de `POST /users` não pode promover uma conta. Para testar a criação de horários, atribua manualmente o papel de professor no banco a uma conta cadastrada e faça login novamente:

```sql
UPDATE users
SET role = 'teacher'
WHERE email = 'professor@example.com';
```

## Testes

```powershell
npm run typecheck
npm test
```

A última verificação registrada aprovou **18 testes de integração** dos fluxos já implementados, cobrindo autenticação, propriedade das reservas, disponibilidade, persistência e conflitos simultâneos. Veja [o relatório e o roteiro manual](docs/validacao-final.md). Esse resultado não indica que as funcionalidades pendentes estejam implementadas ou testadas.

Os testes exigem PostgreSQL acessível pelo `.env` e permissão para criar schemas. Eles executam a aplicação em portas temporárias, criam somente um schema `booking_test_<processo>_<instante>` e o removem ao terminar. As tabelas de `public` não são alteradas. Não é necessário manter `npm run dev` em execução. Se houver encerramento forçado do processo, o schema temporário pode permanecer.

## Documentação

| Documento                                            | Conteúdo                                               |
| ---------------------------------------------------- | ------------------------------------------------------ |
| [Referência da API](docs/api.md)                     | Rotas, autenticação, parâmetros, respostas e erros     |
| [Arquitetura e modelo de dados](docs/arquitetura.md) | Organização dos arquivos, responsabilidades e relações |
| [Banco de dados](docs/banco.md)                      | Schema, migrations e garantias de integridade          |
| [Validação dos fluxos implementados](docs/validacao-final.md) | Cobertura automatizada e roteiro manual |
| [Problemas comuns](docs/problemas-comuns.md)         | Diagnóstico de configuração, cookies e conflitos       |

## Ainda temos que implementar

- **Administração completa da agenda:** permitir edição e exclusão de horários pelo professor responsável, preservando reservas e histórico.
- **Sessões persistentes:** armazenar as sessões no banco para manter o login após reiniciar a aplicação. Atualmente elas ficam no MemoryStore.
- **Tratamento de email:** validar o formato, confirmar o endereço e impedir duplicação por diferença entre maiúsculas e minúsculas.
- **Recuperação de senha e proteção de acesso:** implementar redefinição segura e limites para tentativas de login.
- **Frontend:** criar as telas de conta, disponibilidade, reservas e administração da agenda.
- **Pagamentos, notificações e integração externa:** definir as regras e implementar os serviços escolhidos.
- **Configuração de produção e publicação:** preparar execução, segredos, HTTPS e operação do sistema online.

Essas funcionalidades fazem parte da continuação do projeto. Os testes registrados cobrem o que já foi implementado; não significam que o SaaS completo está concluído.

## Dúvidas e contribuições

Ao abrir uma issue neste repositório, descreva os passos para reproduzir, o resultado esperado, o resultado recebido e as versões de Node.js e PostgreSQL. Não inclua `.env`, senhas, cookies ou hashes de senha.

Para propor uma mudança, explique o problema e como verificou a solução. Antes de enviar, execute os comandos de verificação acima.
