# 03: Confirmar a nova senha e encerrar sessões

**What to build:** com um link válido, a pessoa envia `{ token, password }` para
`POST /users/reset-password` e recebe `204`. A senha antiga deixa de funcionar, a nova entra,
o token não serve outra vez, todas as sessões da conta caem e a pessoa não fica logada.

**Blocked by:** 02 (o roteiro de verificação depende de só existir um token ativo por vez)

**Status:** ready-for-agent

- [x] `POST /users/reset-password` aceita `{ token, password }` sem exigir sessão e responde `204` no sucesso
- [x] Corpo ausente ou com tipo errado responde `400 Token and password are required`
- [x] Senha vazia depois de `trim()` responde `400` e não altera nada
- [x] A senha é gravada com Argon2, crua (sem `trim`), reutilizando a função do cadastro
- [x] O hash da senha é calculado antes de abrir a transação
- [x] O token é reivindicado por atualização condicional que só marca `used_at` se o token não foi usado e não expirou; zero linhas interrompe o fluxo sem efeito
- [x] A troca de senha, o consumo do token e a remoção das sessões acontecem na mesma transação
- [x] O token usado recebe `used_at` e a segunda tentativa de uso não troca a senha
- [x] Todas as sessões do usuário são apagadas, e a resposta limpa o cookie de sessão
- [x] A resposta não cria sessão nem autentica a pessoa
- [x] Depois da troca, login com a senha antiga falha e com a nova funciona
- [x] A troca não altera `name`, `email` nem `role`
- [x] Falha interna responde `500` genérico sem deixar senha trocada pela metade

## Comments

Concluído em 2026-11-15. Verificado por HTTP contra o servidor de dev, com um usuário
descartável criado e apagado no teste: `204` no reset com `Set-Cookie` expirado, senha antiga
`401`, senha nova `200`, os dois cookies antigos `401`, zero sessões do usuário logo após o
reset, reuso do token e token aleatório com `400 Invalid or expired token`, corpo vazio com
`400 Token and password are required`, e `name`/`email`/`role` preservados. Commit `8bebdf0`.
