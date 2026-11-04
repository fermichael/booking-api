# Booking API

Criei esta API para praticar desenvolvimento backend com TypeScript, Express e PostgreSQL, usando uma agenda de aulas como problema real. Ela permite consultar disponibilidade, reservar horários e cancelar as próprias reservas, preservando o histórico.

Meu foco foi evitar que duas pessoas reservem o mesmo horário e garantir que cada conta só acesse suas próprias reservas. Para isso, implementei as verificações na API e as restrições de conflito no banco, incluindo proteção para requisições simultâneas.

**Status: em desenvolvimento.** O fluxo de cadastro, login e reservas já está implementado e pode ser executado localmente. Ainda temos que implementar as funcionalidades necessárias para evoluir esta base para o SaaS de agendamento. Atualmente existe uma agenda compartilhada e a criação de horários é pública.

## Navegação

- [Funcionalidades](#funcionalidades)
- [Tecnologias](#tecnologias)
- [Executar localmente](#executar-localmente)
- [Exemplo de uso](#exemplo-de-uso)
- [Testes](#testes)
- [Documentação](#documentação)
- [Ainda temos que implementar](#ainda-temos-que-implementar)
- [Sobre o projeto](#sobre-o-projeto)
- [Dúvidas e contribuições](#dúvidas-e-contribuições)

## Funcionalidades

- Cadastro com email único e hash de senha com Argon2.
- Login, consulta da conta autenticada e logout por sessão.
- Criação e consulta de horários, com bloqueio de sobreposição.
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

Abra uma conexão para `booking_api` e execute **todo o arquivo** [database/schema.sql](database/schema.sql). Ele cria as três tabelas e as proteções de conflito, sem exigir extensões adicionais.

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
3. `POST /time-slots`: crie um intervalo futuro com `start` e `end`, incluindo fuso horário.
4. `GET /time-slots/available`: confira os horários livres.
5. `POST /bookings`: envie `{ "timeSlotId": 1 }`, substituindo `1` pelo ID criado.
6. `GET /bookings`: consulte suas reservas.
7. `PATCH /bookings/:bookingId`: envie `{ "status": "cancelled" }` para cancelar a reserva criada.
8. `POST /users/logout`: encerre a sessão.

Os corpos completos, exemplos de respostas, regras de validação e erros estão na [referência da API](docs/api.md). O cliente é identificado pelo cookie; não há token Bearer.

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

As anotações e orientações de aprendizado ficam separadas em [estudos/](estudos/README.md). O código da aplicação fica em `src/`.

## Ainda temos que implementar

- **Permissões de professor:** usar o papel da conta para proteger a criação e a administração de horários. Hoje, `POST /time-slots` ainda é público.
- **Agendas independentes:** vincular cada horário ao professor responsável e impedir acesso indevido entre professores.
- **Sessões persistentes:** armazenar as sessões no banco para manter o login após reiniciar a aplicação. Atualmente elas ficam no MemoryStore.
- **Tratamento de email:** validar o formato, confirmar o endereço e impedir duplicação por diferença entre maiúsculas e minúsculas.
- **Recuperação de senha e proteção de acesso:** implementar redefinição segura e limites para tentativas de login.
- **Edição e exclusão de horários:** permitir que o professor administre a própria agenda preservando reservas e histórico.
- **Frontend:** criar as telas de conta, disponibilidade, reservas e administração da agenda.
- **Pagamentos, notificações e integração externa:** definir as regras e implementar os serviços escolhidos.
- **Configuração de produção e publicação:** preparar execução, segredos, HTTPS e operação do sistema online.

Essas funcionalidades fazem parte da continuação do projeto. Os testes registrados cobrem o que já foi implementado; não significam que o SaaS completo está concluído.

## Sobre o projeto

Desenvolvi este projeto para aprofundar meus conhecimentos em HTTP, autenticação por sessão, autorização, consultas SQL e integridade dos dados. Comecei com arrays em memória e depois migrei as contas, os horários e as reservas para PostgreSQL.

Autor: [Michael Guimarães](https://github.com/fermichael).

## Dúvidas e contribuições

Ao abrir uma issue neste repositório, descreva os passos para reproduzir, o resultado esperado, o resultado recebido e as versões de Node.js e PostgreSQL. Não inclua `.env`, senhas, cookies ou hashes de senha.

Para propor uma mudança, explique o problema e como verificou a solução. Antes de enviar, execute os comandos de verificação acima.
