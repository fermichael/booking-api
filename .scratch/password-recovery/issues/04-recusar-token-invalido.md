# 04: Recusar token inválido sem revelar o motivo

**What to build:** token expirado, já usado, inexistente ou adulterado responde sempre o
mesmo `400` com a mesma mensagem, sem indicar qual dos casos ocorreu. A tentativa não altera
a senha, não consome o token válido, não derruba sessões e não deixa nenhum token no log.
Pedir um novo link derruba o anterior, e o antigo passa a receber essa mesma resposta.

**Blocked by:** 03 (Confirmar a nova senha e encerrar sessões)

**Status:** ready-for-agent

- [x] Token expirado, consumido, inexistente e adulterado respondem o mesmo status, o mesmo corpo e a mesma mensagem (`Invalid or expired token`)
- [x] Nenhuma resposta de erro revela se o token existiu, se expirou ou se já foi usado
- [x] Token inválido é recusado antes de calcular o Argon2, por uma consulta barata ao hash
- [x] Tentativa com token inválido não altera a senha, não consome token válido e não apaga sessões
- [x] Dois resets simultâneos com o mesmo token: um conclui e o outro recebe o `400` genérico, mesmo que ambos passem pela consulta barata
- [x] Pedir um novo link invalida o anterior, e o token anterior passa a receber a mesma resposta genérica
- [x] Mensagem de corpo inválido (`Token and password are required`) continua distinta da mensagem de token inválido
- [x] Nenhum token, válido ou inválido, aparece em log

## Comments

Concluído em 2026-11-15. Verificado por HTTP: token aleatório e token expirado respondem o
mesmo `400 Invalid or expired token` sem derrubar sessão e sem consumir o token válido; dois
resets simultâneos com o mesmo token resultam em `[204, 400]`, com apenas uma das senhas
funcionando; nenhuma linha do código registra token em log. Commit `f7ed825`.
