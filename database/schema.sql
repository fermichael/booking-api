CREATE EXTENSION IF NOT EXISTS btree_gist;
BEGIN;

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'student',
    CONSTRAINT users_role_check CHECK (role IN ('student', 'teacher'))
);

CREATE UNIQUE INDEX users_email_lower_unique
ON users (LOWER(email));

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

CREATE TABLE sessions (
    sid TEXT NOT NULL PRIMARY KEY,
    sess JSON NOT NULL,
    expire TIMESTAMP(6) NOT NULL
);

CREATE INDEX sessions_expire
ON sessions (expire);

CREATE TABLE password_reset_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX password_reset_tokens_user_id_idx
ON password_reset_tokens (user_id);

CREATE UNIQUE INDEX password_reset_tokens_one_active_per_user
ON password_reset_tokens (user_id)
WHERE used_at IS NULL;

COMMIT;
