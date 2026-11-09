-- Apply after 001_rename_students_to_users.sql.
-- Existing time slots must be associated with a teacher before this
-- migration can make teacher_id mandatory.

CREATE EXTENSION IF NOT EXISTS btree_gist;

BEGIN;

ALTER TABLE time_slots
ADD COLUMN IF NOT EXISTS teacher_id INTEGER REFERENCES users(id);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM time_slots
    WHERE teacher_id IS NULL
  ) THEN
    RAISE EXCEPTION 'Assign a teacher_id to every existing time slot before continuing';
  END IF;
END $$;

ALTER TABLE time_slots
ALTER COLUMN teacher_id SET NOT NULL;

ALTER TABLE time_slots
DROP CONSTRAINT IF EXISTS time_slots_no_overlap;

ALTER TABLE time_slots
DROP CONSTRAINT IF EXISTS time_slots_no_overlap_per_teacher;

ALTER TABLE time_slots
ADD CONSTRAINT time_slots_no_overlap_per_teacher
EXCLUDE USING gist (
  teacher_id WITH =,
  tstzrange(starts_at, ends_at, '[)') WITH &&
);

COMMIT;
