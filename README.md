# Booking API

Criei esta API para praticar desenvolvimento backend com TypeScript, Express e PostgreSQL, usando uma agenda de aulas como problema real. Ela permite consultar disponibilidade, reservar horários e cancelar as próprias reservas, preservando o histórico.

Meu foco foi evitar que duas pessoas reservem o mesmo horário e garantir que cada conta só acesse suas próprias reservas. Para isso, implementei as verificações na API e as restrições de conflito no banco, incluindo proteção para requisições simultâneas.

**Status: versão 1.0.0 de estudo, para demonstração local.** A criação de horários é pública e as sessões ficam em memória. As permissões de professor e agendas independentes ainda não foram implementadas.

## Navegação

- [Funcionalidades](#funcionalidades)
- [Tecnologias](#tecnologias)
- [Executar localmente](#executar-localmente)
- [Exemplo de uso](#exemplo-de-uso)
- [Testes](#testes)
- [Documentação](#documentação)
- [Limitações](#limitações)
- [Sobre o projeto](#sobre-o-projeto)
- [Dúvidas e contribuições](#dúvidas-e-contribuições)

## Funcionalidades

- Cadastro com email único e hash de senha com Argon2.
- Login, consulta da conta autenticada e logout por sessão.
- Criação e consulta de horários, com bloqueio de sobreposição.
- Disponibilidade baseada em horários futuros sem reserva confirmada.
- Reserva e cancelamento restritos ao dono, com histórico e possibilidade de nova reserva após cancelar.
- Bloqueio de reserva e cancelamento de reservas confirmadas após o início da aula.
- Proteções de concorrência no PostgreSQL e testes HTTP integrados.

## Tecnologias

| Finalidade           | Tecnologias                         |
| -------------------- | ----------------------------------- |
| Linguagem e execução | TypeScript, Node.js 24 e tsx        |
| HTTP e autenticação  | Express 5, express-session e Argon2 |
| Banco e configuração | PostgreSQL 18, pg e dotenv          |
| Qualidade            | node:test, assert, fetch e Prettier |

## Executar localmente

### 1. Pré-requisitos

- Node.js 24, versão verificada neste projeto.
- PostgreSQL 18, versão usada no desenvolvimento.
- DBeaver, pgAdmin ou `psql` para executar os scripts SQL.

Baixe ou clone este repositório e abra um terminal na pasta que contém `package.json`. Os comandos abaixo usam PowerShell no Windows.

Na raiz do projeto:

```powershell
npm ci
Copy-Item .env.example .env
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

### 2. Preparar um banco novo

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

A validação final registrou **18 testes de integração aprovados**, cobrindo autenticação, propriedade das reservas, disponibilidade, persistência e conflitos simultâneos. Veja [o relatório e o roteiro manual](docs/validacao-final.md).

Os testes exigem PostgreSQL acessível pelo `.env` e permissão para criar schemas. Eles executam a aplicação em portas temporárias, criam somente um schema `booking_test_<processo>_<instante>` e o removem ao terminar. As tabelas de `public` não são alteradas. Não é necessário manter `npm run dev` em execução. Se houver encerramento forçado do processo, o schema temporário pode permanecer.

## Documentação

| Documento                                            | Conteúdo                                               |
| ---------------------------------------------------- | ------------------------------------------------------ |
| [Referência da API](docs/api.md)                     | Rotas, autenticação, parâmetros, respostas e erros     |
| [Arquitetura e modelo de dados](docs/arquitetura.md) | Organização dos arquivos, responsabilidades e relações |
| [Banco de dados](docs/banco.md)                      | Schema, migrations e garantias de integridade          |
| [Validação final](docs/validacao-final.md)           | Cobertura automatizada e roteiro manual                |
| [Problemas comuns](docs/problemas-comuns.md)         | Diagnóstico de configuração, cookies e conflitos       |

## Limitações

- Uma única agenda compartilhada. **`POST /time-slots` é público**; não há autorização de professor nem vínculo `teacher_id`.
- A coluna `users.role` aceita `student` e `teacher`, mas ainda não controla rotas. O cadastro público sempre usa o padrão `student`.
- Sessões no MemoryStore: reiniciar a API encerra os logins. Contas, horários e reservas permanecem no PostgreSQL.
- Emails têm espaços externos removidos, mas a unicidade é sensível a maiúsculas. Não há confirmação de email nem validação completa de seu formato.
- Sem recuperação de senha, limitação de tentativas de login ou configuração de produção.
- Sem frontend, edição/exclusão de horários, pagamentos, notificações ou integração externa.

Nesta versão, mantive o escopo em uma demonstração local de uma agenda compartilhada. A gestão de professores, as agendas independentes e a publicação ficam para uma próxima etapa.

## Sobre o projeto

Desenvolvi este projeto para aprofundar meus conhecimentos em HTTP, autenticação por sessão, autorização, consultas SQL e integridade dos dados. Comecei com arrays em memória e depois migrei as contas, os horários e as reservas para PostgreSQL.

Autor: [Michael Guimarães](https://github.com/fermichael).

## Dúvidas e contribuições

Ao abrir uma issue neste repositório, descreva os passos para reproduzir, o resultado esperado, o resultado recebido e as versões de Node.js e PostgreSQL. Não inclua `.env`, senhas, cookies ou hashes de senha.

Para propor uma mudança, explique o problema e como verificou a solução. Antes de enviar, execute os comandos de verificação acima.
