# 01: Pedir o link de recuperação

**What to build:** qualquer pessoa, autenticada ou não, informa um email em
`POST /users/password-reset` e recebe um link de recuperação por email. A resposta é
sempre a mesma — `202 Accepted` com mensagem genérica — exista ou não a conta. O link
carrega um token de uso único que expira em 30 minutos.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Existe a tabela `password_reset_tokens` (migration aditiva `005`), com referência ao usuário, hash do token, expiração, data de uso e criação
- [ ] `POST /users/password-reset` responde `202` com a mesma mensagem para email cadastrado, não cadastrado e com formato inválido
- [ ] O email é enviado via módulo de email existente, com link montado a partir da URL base configurada em variável de ambiente
- [ ] O banco guarda apenas o hash SHA-256 do token; o valor em claro aparece somente no link
- [ ] O token tem 32 bytes aleatórios e expira em 30 minutos
- [ ] Um novo pedido do mesmo usuário invalida o token ativo anterior
- [ ] Nenhum token é escrito em log
- [ ] Pedir o link não cria sessão nem altera a sessão de quem está logado
