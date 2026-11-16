-- Reconcilia um banco que veio de `students` com o schema atual.
-- A migration 001 renomeou a tabela, mas preservou os nomes das constraints e da
-- sequence; a 004 tentou remover `users_email_key` em vez de `students_email_key`.
-- Seguro para rodar num banco que já está com os nomes novos.

BEGIN;

UPDATE users SET email = lower(trim(email));

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM users GROUP BY lower(trim(email)) HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Emails duplicados apos a normalizacao';
  END IF;
END $$;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;
ALTER TABLE users DROP CONSTRAINT IF EXISTS students_email_key;

CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_unique
ON users (lower(email));

DO $$
DECLARE
  renomear RECORD;
BEGIN
  FOR renomear IN
    SELECT antigo, novo
    FROM (VALUES
      ('students_pkey', 'users_pkey'),
      ('students_role_check', 'users_role_check'),
      ('students_id_not_null', 'users_id_not_null'),
      ('students_name_not_null', 'users_name_not_null'),
      ('students_email_not_null', 'users_email_not_null'),
      ('students_password_hash_not_null', 'users_password_hash_not_null'),
      ('students_role_not_null', 'users_role_not_null')
    ) AS nomes(antigo, novo)
  LOOP
    IF EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = 'public.users'::regclass AND conname = renomear.antigo
    ) AND NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = 'public.users'::regclass AND conname = renomear.novo
    ) THEN
      EXECUTE format(
        'ALTER TABLE public.users RENAME CONSTRAINT %I TO %I',
        renomear.antigo,
        renomear.novo
      );
    END IF;
  END LOOP;
END $$;

DO $$
BEGIN
  IF to_regclass('public.students_id_seq') IS NOT NULL
     AND to_regclass('public.users_id_seq') IS NULL THEN
    ALTER SEQUENCE public.students_id_seq RENAME TO users_id_seq;
  END IF;
END $$;

COMMIT;
