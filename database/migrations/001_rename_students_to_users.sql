-- Run once against an existing booking_api database that still has students.
-- PostgreSQL preserves the rows, defaults, constraints and foreign-key references.
BEGIN;

ALTER TABLE public.students RENAME TO users;

COMMIT;
