# 02: Garantir um único token ativo por usuário

**What to build:** dois pedidos de link não podem deixar dois caminhos válidos abertos. Depois
de qualquer pedido novo, só o token mais recente continua ativo — inclusive se dois pedidos
chegarem ao mesmo tempo. Tokens já usados daquele usuário são removidos na mesma operação.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [x] Migration `006` apaga duplicados ativos mantendo o mais recente por usuário e cria índice único parcial em `(user_id) WHERE used_at IS NULL`
- [x] A migration não usa `IF NOT EXISTS`: rodar duas vezes falha em vez de esconder o problema
- [x] Migration aplicada no banco local e conferida no catálogo (`pg_indexes`)
- [x] A emissão de token substitui o ativo atomicamente, usando o índice parcial como árbitro do upsert, em vez de `DELETE` seguido de `INSERT`
- [x] Dois pedidos simultâneos terminam com exatamente uma linha ativa para o usuário
- [x] Pedir um novo link apaga os tokens já usados daquele usuário
- [x] O índice comum em `user_id` da migration `005` permanece
- [x] O endpoint de pedido continua respondendo `202` genérico e enviando o email como antes

## Comments

Concluído em 2026-11-15. Migration `006` aplicada e conferida no catálogo (`pg_indexes`).
Verificado por teste de concorrência que dois pedidos simultâneos deixam exatamente uma
linha ativa, e que o token usado do usuário é removido na emissão seguinte. Commit `426162e`.
