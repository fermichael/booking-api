# 02: Redefinir a senha com o link

**What to build:** quem recebeu o link abre, informa a nova senha em
`POST /users/password-reset/confirm` com o token, e consegue entrar com ela. A senha
antiga para de funcionar, o token não serve mais, todas as sessões da conta são encerradas
e a pessoa não é autenticada automaticamente.

**Blocked by:** 01 (Pedir o link de recuperação)

**Status:** ready-for-agent

- [ ] `POST /users/password-reset/confirm` recebe `token` e `password` e responde `204` em caso de sucesso
- [ ] A senha é gravada com Argon2, reutilizando a mesma função do cadastro
- [ ] A validação da nova senha é a mesma do cadastro (string não vazia)
- [ ] O token usado é marcado como consumido e não pode ser reutilizado
- [ ] Todas as sessões ativas do usuário são apagadas ao concluir a troca
- [ ] A resposta não cria sessão nem define cookie de login
- [ ] Depois da troca, login com a senha antiga falha e com a nova funciona
- [ ] A troca não altera `name`, `email` nem `role`
