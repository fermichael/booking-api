# Validação dos fluxos implementados

O projeto continua em desenvolvimento. Este registro verifica a etapa já implementada, não a conclusão do SaaS.

> Validação executada em **4 de novembro de 2026** com **Node.js 24.19.0** e **PostgreSQL local**.

## Resultado

- **TypeScript:** `npm run typecheck` passou.
- **Integração:** 18 testes passaram, sem falhas ou casos ignorados.
- **Persistência:** um novo processo confirmou login e leitura de registros persistidos após reiniciar a aplicação.

## Escopo

Os testes cobrem uma agenda compartilhada, contas e reservas persistidas no PostgreSQL, autenticação por sessão e cancelamento com histórico. A permissão de professor e as agendas independentes ainda não fazem parte desta versão. A criação de horários é pública.

## Como reproduzir

```powershell
npm run typecheck
npm test
```

Os testes de `tests/integration.cjs` exercitam a aplicação real via HTTP e o PostgreSQL real. O arquivo `database/schema.sql` é executado em um schema temporário isolado. O teste verifica o `search_path` antes de iniciar a aplicação. Os dados públicos existentes não são modificados. A limpeza remove somente o schema temporário gerado pelo próprio teste.

## Cobertura dos testes

| Área | Cenários |
| --- | --- |
| HTTP | Saúde do processo, rota inexistente e JSON malformado |
| Autenticação | Rejeição sem login, credenciais erradas, hash Argon2, renovação de sessão, cookie e logout |
| Cadastro | Campos inválidos, email duplicado e cadastros simultâneos com o mesmo email |
| Permissões | Reservas de outro usuário não são listadas nem canceladas; a identidade enviada no corpo é ignorada |
| Datas e IDs | Datas inválidas, ausência de fuso, ordem inválida, valores não inteiros, negativos e fora do limite `INTEGER` |
| Horários | Criação, listagem, busca, adjacência e sobreposição |
| Reservas | Criação, duplicação, cancelamento repetido, histórico e nova reserva após cancelar |
| Início da aula | Bloqueio de reserva e cancelamento de horário iniciado |
| Concorrência | Duas tentativas HTTP de criar horários sobrepostos e duas reservas simultâneas |
| Banco | Inserções diretas confirmam que as restrições continuam valendo sem a consulta prévia do service |
| Persistência | Conexão independente e novo processo Node conseguem ler os dados e fazer login |

A suíte não é uma auditoria de segurança nem um teste de carga. Os casos de concorrência verificam as garantias centrais com duas requisições; não representam todos os possíveis cenários de produção.

## Roteiro manual no Postman

1. Execute `npm run dev` e consulte `GET /health`.
2. Cadastre duas contas em `POST /users` e repita um email para conferir o `409`.
3. Faça login na primeira conta e consulte `GET /users/me`.
4. Crie um horário futuro em `POST /time-slots` e anote o ID. Tente um intervalo sobreposto (`409`) e outro que comece no instante de término (`201`).
5. Consulte `GET /time-slots/available`; o horário futuro deve aparecer.
6. Reserve esse horário com `POST /bookings`. Envie somente `timeSlotId` e anote o `bookingId`.
7. Confira que a reserva aparece em `GET /bookings` e que o horário desaparece dos disponíveis.
8. Faça login na segunda conta, mantendo um cookie separado ou substituindo o login atual. Ela não deve listar a reserva da primeira; tentar cancelá-la deve responder `404`.
9. Volte à primeira conta, cancele a reserva e repita o cancelamento. O horário volta à lista de disponíveis, e o histórico guarda o registro cancelado.
10. Faça uma nova reserva para o mesmo horário. Ela deve ter outro `bookingId`.
11. Reinicie o servidor. Faça login novamente: as contas, os horários e as reservas continuam no banco, mas a sessão anterior não continua em memória.
12. Faça logout. `GET /users/me` e as rotas de reservas devem voltar a responder `401`.

## Decisões de implementação

- `app.ts` separado da escuta de `server.ts` para permitir testes HTTP isolados.
- Datas da API exigem formato ISO com fuso e calendário válido, evitando conversões ambíguas ou falhas SQL por datas inexistentes.
- IDs são limitados ao intervalo positivo de INTEGER do banco.
- Nomes e emails têm espaços externos removidos; a senha original é preservada.
- Resultados dos principais SELECTs e RETURNINGs passaram a ter tipos explícitos.
- Inserção e cancelamento de reservas repetem a condição temporal na própria escrita SQL, reduzindo a janela entre verificar o horário e escrever.
- Erros de JSON e rotas inexistentes retornam JSON consistente.
- Foram adicionados schema reproduzível, exemplo de ambiente e script real de testes.

## Ainda temos que implementar

Permissões e agendas por professor, sessões persistentes, validação e confirmação de email, recuperação de senha, limites de acesso, edição/exclusão de horários, frontend, pagamentos, notificações, integração externa e configuração de produção. A lista atual está no [README](../README.md#ainda-temos-que-implementar).
