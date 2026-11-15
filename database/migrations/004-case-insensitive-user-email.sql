-- Normalize existing emails and enforce uniqueness without case sensitivity.
BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT LOWER(TRIM(email))
    FROM users
    GROUP BY LOWER(TRIM(email))
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate emails found after normalization';
  END IF;
END $$;

UPDATE users
SET email = LOWER(TRIM(email));

ALTER TABLE users
DROP CONSTRAINT IF EXISTS users_email_key;

CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_unique
ON users (LOWER(email));

COMMIT;
