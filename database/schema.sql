CREATE EXTENSION IF NOT EXISTS btree_gist;
BEGIN;

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'student',
    CONSTRAINT users_role_check CHECK (role IN ('student', 'teacher'))
);

CREATE TABLE time_slots (
    id SERIAL PRIMARY KEY,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    teacher_id INTEGER NOT NULL REFERENCES users(id),
    CONSTRAINT time_slots_no_overlap_per_teacher EXCLUDE USING gist (
        teacher_id WITH =,
        tstzrange(starts_at, ends_at, '[)') WITH &&
    )
);

CREATE TABLE bookings (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES users(id),
    time_slot_id INTEGER NOT NULL REFERENCES time_slots(id),
    status TEXT NOT NULL DEFAULT 'confirmed'
);

CREATE UNIQUE INDEX bookings_one_confirmed_per_slot
ON bookings (time_slot_id)
WHERE status = 'confirmed';

COMMIT;
