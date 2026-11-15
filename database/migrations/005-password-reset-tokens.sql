BEGIN;

CREATE TABLE password_reset_tokens(
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at timestamptz not null,
    used_at timestamptz,
    created_at timestamptz not null default now()
);

CREATE INDEX password_reset_tokens_user_id_idx
ON password_reset_tokens (user_id);

COMMIT;