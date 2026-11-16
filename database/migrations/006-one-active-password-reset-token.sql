-- Garante no máximo um token de recuperação ativo por usuário.
-- Um token expirado mas não usado continua ativo aos olhos do índice,
-- então é sobrescrito pelo próximo pedido, nunca somado a ele.

BEGIN;

-- Mantém o token ativo mais recente de cada usuário e remove os anteriores.
-- O id desempata quando dois tokens foram criados no mesmo instante.
DELETE FROM password_reset_tokens AS duplicate
USING password_reset_tokens AS newer
WHERE duplicate.user_id = newer.user_id
  AND duplicate.used_at IS NULL
  AND newer.used_at IS NULL
  AND (duplicate.created_at, duplicate.id) < (newer.created_at, newer.id);

CREATE UNIQUE INDEX password_reset_tokens_one_active_per_user
ON password_reset_tokens (user_id)
WHERE used_at IS NULL;

COMMIT;
