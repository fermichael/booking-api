# Spec: Recuperação de senha

**Status:** ready-for-agent

## Problem Statement

Aluno ou professor esquece a senha e não consegue mais entrar na conta. Hoje não existe
nenhum caminho de volta: a senha só pode ser definida no cadastro, então a conta fica
inacessível para sempre. Quem esqueceu precisa criar outra conta e perde o histórico de
reservas e horários.

## Solution

Um fluxo de dois passos por email:

1. A pessoa informa o email em `POST /users/forgot-password` e recebe um link com um token
   de uso único, válido por 30 minutos.
2. A pessoa envia o token e a nova senha para `POST /users/reset-password`.

A resposta ao pedido é sempre a mesma, exista ou não a conta, para que ninguém use o
endpoint para descobrir quais emails estão cadastrados. Ao concluir a troca, a senha antiga
para de funcionar, todas as sessões ativas daquela conta são encerradas e a pessoa não é
autenticada automaticamente.

Token expirado, token já usado e token inexistente ou adulterado recebem exatamente a mesma
resposta. Só existe um token ativo por usuário, mesmo se dois pedidos chegarem ao mesmo
tempo: o último pedido vence e o link anterior morre.

## User Stories

1. Como pessoa que esqueceu a senha, quero informar meu email e receber um link de recuperação, para que eu consiga voltar a acessar minha conta.
2. Como pessoa que não tem conta, quero receber a mesma resposta de quem tem, para que eu não consiga descobrir quais emails estão cadastrados.
3. Como pessoa que digitou um email vazio ou malformado, quero um erro de validação claro, para que eu corrija o que digitei em vez de esperar por um email que nunca vai chegar.
4. Como pessoa que pediu o link, quero que ele expire em 30 minutos, para que um link esquecido numa caixa de email antiga não continue valendo.
5. Como pessoa que pediu o link, quero que ele funcione uma única vez, para que ninguém que o encontre depois possa reutilizá-lo.
6. Como pessoa que pediu um novo link, quero que o anterior pare de funcionar, para que eu não fique com vários links válidos ao mesmo tempo.
7. Como pessoa que clicou duas vezes no botão de pedir link, quero que apenas um link valha, para que uma corrida entre pedidos não deixe dois caminhos de entrada abertos.
8. Como pessoa que abriu o link, quero definir uma nova senha e entrar com ela, para que eu recupere o acesso.
9. Como pessoa que trocou a senha, quero que a senha antiga deixe de funcionar, para que quem a tinha não consiga mais entrar.
10. Como pessoa que trocou a senha porque desconfiava de invasão, quero que todas as sessões abertas sejam encerradas, para que o invasor seja expulso.
11. Como pessoa que trocou a senha, quero continuar sem estar logado, para que eu confirme que sei a nova senha antes de entrar.
12. Como pessoa que recebeu um link expirado, quero uma resposta igual à de qualquer link inválido, para que eu saiba pedir outro sem descobrir nada sobre tokens de terceiros.
13. Como pessoa que recebeu um link já usado, quero a mesma resposta de link inválido, para que eu não descubra se ele já foi usado por outra pessoa.
14. Como pessoa que digita um token adulterado, quero ser recusado, para que adivinhar tokens não seja um caminho de entrada.
15. Como pessoa que teve o token vazado, quero que ele não sirva depois de consumido, para que o vazamento não reabra a conta.
16. Como operador do sistema, quero que os tokens sejam guardados apenas como hash, para que um vazamento do banco não permita usá-los.
17. Como operador do sistema, quero que nenhum token apareça em log, para que os logs não se tornem uma lista de links válidos.
18. Como pessoa que errou o token, quero que a tentativa não altere minha senha nem derrube minhas sessões, para que um erro de digitação não tenha efeito colateral.
19. Como professor ou aluno, quero que a nova senha siga a mesma regra do cadastro, para que o comportamento seja previsível.
20. Como professor ou aluno, quero que a troca de senha não altere meu nome, email nem papel, para que a recuperação mexa só no que precisa.
21. Como pessoa que vai usar a futura página de reset, quero que o token chegue no fragmento da URL, para que ele não vaze em log de servidor, histórico de proxy ou cabeçalho `Referer`.

## Implementation Decisions

**Contratos**

| Endpoint | Corpo | Respostas |
| --- | --- | --- |
| `POST /users/forgot-password` | `{ email }` | `400` para email ausente, vazio, malformado ou longo demais; `202` genérico para email bem formado, exista ou não a conta |
| `POST /users/reset-password` | `{ token, password }` | `400 Token and password are required` para corpo ausente ou de tipo errado; `400 Invalid or expired token` para token inativo; `204` no sucesso; `500` para falha interna |

- Os dois endpoints são públicos: o token é a credencial do segundo.
- `forgot-password` continua distinguindo erro de sintaxe (`400`) de email bem formado
  (`202`). O `400` não revela existência de conta, só que o cliente enviou algo que não é
  email. A mensagem do `202` é genérica e igual nos dois casos.
- `reset-password` não diferencia token expirado, já usado, inexistente ou adulterado: mesmo
  status, mesmo corpo, mesma mensagem.
- Erro interno responde `500` com mensagem genérica, seguindo o padrão dos outros controllers.

**Ciclo do token**

- 32 bytes gerados pelo CSPRNG do Node, codificados em base64url no link.
- No banco vai apenas o SHA-256 em hexadecimal. O valor em claro existe só no email.
- Expiração de 30 minutos contada da criação; uso único.
- No máximo um token ativo por usuário, garantido no banco por índice único parcial em
  `(user_id) WHERE used_at IS NULL`, criado por uma migration nova (`006`) porque a `005` já
  foi aplicada. A migration remove duplicados mantendo o mais recente por usuário antes de
  criar o índice, e falha em vez de silenciar se rodar duas vezes.
- Emitir um novo token apaga os tokens já usados daquele usuário e substitui o ativo com um
  upsert que usa o índice parcial como árbitro. O último pedido vence, e dois pedidos
  simultâneos terminam com exatamente um token ativo.
- O índice comum em `user_id` da migration `005` permanece: ele serve às consultas de
  limpeza de tokens usados, que o índice parcial não cobre.
- Se o envio do email falhar, o erro é logado e a resposta continua `202`. O token criado
  permanece válido; um novo pedido gera outro link.

**Fluxo de confirmação**

1. Valida o corpo. A senha só precisa não ser vazia depois de `trim()` e é guardada crua,
   como no cadastro.
2. Consulta barata por hash do token, conferindo token não usado e não expirado. Se não
   achar, responde o `400` genérico antes de gastar CPU com Argon2.
3. Calcula o hash Argon2 da nova senha, fora de qualquer transação.
4. Abre transação e reivindica o token com uma atualização condicional: marca `used_at`
   apenas se ainda não foi usado e não expirou, retornando o usuário. Zero linhas significa
   que outro pedido consumiu o token no meio do caminho; rollback e o mesmo `400`.
5. Atualiza o hash da senha do usuário.
6. Apaga todas as sessões daquele usuário.
7. Commit, resposta `204`, `clearCookie` do cookie de sessão e nenhuma sessão nova.

A consulta do passo 2 é só economia de CPU; a autoridade é a atualização condicional do
passo 4, que é atômica. Calcular o hash antes da transação mantém o lock curto.

**Persistência e documentação**

- `schema.sql` passa a ser o snapshot completo do banco: `users`, `time_slots`, `bookings`,
  `sessions` e `password_reset_tokens`, com seus índices, incluindo o parcial único.
- Numa instalação nova basta executar o snapshot. As migrations `001` a `007` ficam
  documentadas apenas para atualizar bancos existentes.
- A `007` existe porque a `004` tentou remover `users_email_key` em vez de
  `students_email_key` e nunca criou o índice de email em minúsculas; ela também renomeia as
  constraints e a sequence herdadas de `students`. É segura para quem já está com os nomes
  novos.
- O README passa a documentar as duas rotas, o teste manual e a mudança no setup, e deixa de
  listar recuperação de senha como pendente.

**Segurança e concorrência**

- Nenhum token, válido ou inválido, é escrito em log.
- Token inválido não altera senha, não consome token válido e não derruba sessões.
- Dois resets simultâneos com o mesmo token: só um vê a linha na atualização condicional, o
  outro recebe o `400` genérico.
- O fluxo só altera a senha; `name`, `email` e `role` ficam intactos.
- O link do email usa `${APP_URL}/reset-password#token=...`. O fragmento não é enviado ao
  servidor nem entra em `Referer`; a futura página lê o token do fragmento, usa uma vez e
  limpa a URL.

## Testing Decisions

- Não existe suíte automatizada neste repo, e criar uma está fora do escopo desta spec.
- O seam escolhido é o **HTTP**: os dois endpoints, exercitados por requisições reais contra
  o banco real. Nenhuma verificação deve chamar funções internas de geração de token ou de
  hash. É o único seam existente; nenhum seam novo é proposto.
- Um bom teste aqui verifica comportamento externo: status, corpo e efeito observável no
  banco e nas sessões. Não deve depender de nomes de tabelas internas além do necessário
  para conferir `used_at` e a contagem de sessões.
- O token em claro existe apenas no email; o banco guarda só o hash. Por isso a verificação
  manual usa o link recebido, não uma consulta ao banco.
- Roteiro manual: criar conta, fazer login em dois clientes, pedir o link, copiar o token da
  URL do email, chamar o reset, conferir `204`, tentar login com a senha antiga (falha) e com
  a nova (funciona), conferir que as sessões antigas respondem `401` e que o mesmo token
  responde `400` na segunda tentativa.
- Também manual, sem suíte: dois pedidos de link em sequência (o primeiro token falha), dois
  pedidos simultâneos (sobra um token ativo), token adulterado (mesma resposta do expirado,
  sem efeito colateral).

## Out of Scope

- Rate limit no pedido de recuperação. **Adiado por decisão explícita**: não é a etapa
  seguinte. Entra depois da publicação, quando houver domínio e o número de instâncias for
  conhecido — os números do limite e a camada por IP dependem disso. Ver "Próximos passos"
  no README.
- Página de reset e qualquer frontend; o fluxo é validado por cliente HTTP.
- Confirmação de email no cadastro.
- Alteração de email ou de nome.
- Regras de força de senha além da regra atual do cadastro.
- Notificação de "senha alterada" por email, bloqueio de conta e histórico de alterações.
- Job periódico de limpeza de tokens: a limpeza é oportunista, na emissão do próximo token.
- Pagamentos.

## Further Notes

- A ordem importa: este fluxo define o padrão de token de uso único por email que será
  reaproveitado na confirmação de email e no convite de professor.
- A mensagem genérica é decisão de segurança, não de UX. O frontend pode explicar ao usuário
  o que fazer a seguir sem que a API confirme se o email existe.
- Enquanto a página não existir, o link do email abre uma rota inexistente (404). O teste
  manual copia o token do fragmento da URL. Isso é esperado até o frontend.
- A variável `RESEND_TEST_TO` existe no `.env` mas não é usada por nenhum código. Fica como
  ponta solta para a etapa de email, não faz parte desta spec.
