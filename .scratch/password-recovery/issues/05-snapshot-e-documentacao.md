# 05: Snapshot do schema e documentação de teste

**What to build:** uma instalação nova reproduz o banco inteiro com um único arquivo, e o
README ensina a testar o fluxo de recuperação de senha de ponta a ponta sem frontend.

**Blocked by:** 04 (Recusar token inválido sem revelar o motivo)

**Status:** ready-for-agent

- [x] `database/schema.sql` cria `users`, `time_slots`, `bookings`, `sessions` e `password_reset_tokens`, com todos os índices, incluindo o único parcial de token ativo
- [x] Um banco novo criado só com o snapshot tem as mesmas tabelas, colunas, índices e constraints que o banco local atual
- [x] O README passa a dizer que instalação nova executa apenas o snapshot; migrations `001` a `006` ficam documentadas para atualizar bancos existentes
- [x] O README documenta as duas rotas com corpo, status e mensagens
- [x] O README tem o roteiro manual: criar conta, abrir sessão em dois clientes, pedir link, copiar o token do fragmento da URL do email, confirmar, conferir que a senha antiga falha e a nova entra, que as sessões antigas respondem `401` e que reusar o token responde `400`
- [x] Recuperação de senha sai da lista de pendências; rate limit, página de reset e frontend aparecem como próximos passos
- [x] `npm run typecheck` passa

## Comments

Concluído em 2026-11-15. O snapshot foi verificado criando o banco descartável
`booking_api_snapshot_check` só com `database/schema.sql` e comparando colunas, índices,
constraints e sequences com o banco local: 67 linhas idênticas, banco apagado em seguida.

Durante a verificação apareceu uma divergência real no banco local: a migration `004` tentou
dropar `users_email_key` em vez de `students_email_key`, então o índice de email em minúsculas
nunca existiu e as constraints/sequence continuavam com prefixo `students_`. A migration `007`
corrige isso e já foi aplicada; agora `users` tem `users_pkey`, `users_email_lower_unique` e a
sequence `users_id_seq`.

O README ficou de fora deste commit por decisão de escopo (só código é commitado por enquanto).
Commit `917ec3f`.

**Correção posterior (2026-11-15).** O código montava o link com query string
(`/reset-password?token=...`), contrariando a decisão da spec de usar fragmento. Os testes dos
tickets `03` e `04` criavam o token pelo service, então nunca viram a URL do email, e a
divergência passou. Corrigido em `a5f0f9b`: `buildPasswordResetUrl` monta
`/reset-password#token=...` e é verificável sem enviar email. Ficou claro que a regra
"nenhum token em log" precisa ser conferida também no link, não só nas queries.
