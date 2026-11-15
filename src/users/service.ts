import * as argon2 from "argon2";
import { createHash, randomBytes } from "node:crypto";

import { pool } from "../database";

export type UserRole = {
  id: number;
  role: "teacher" | "student";
};

export type UserSummary = UserRole & {
  name: string;
  email: string;
};

type User = {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  role: "student" | "teacher";
};

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function addUser(name: string, email: string, password: string) {
  const password_hash = await argon2.hash(password);
  const normalizedEmail = normalizeEmail(email);

  const result = await pool.query(
    "INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING RETURNING id, name, email",
    [name, normalizedEmail, password_hash],
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}

export async function findUserByEmail(email: string) {
  const result = await pool.query(
    "SELECT id, name, email, password_hash, role FROM users WHERE email = $1",
    [normalizeEmail(email)],
  );

  return result.rows[0];
}

export async function findUserById(id: number) {
  const result = await pool.query<UserSummary>(
    `SELECT id, name, email, role FROM users WHERE id = $1`,
    [id],
  );

  return result.rows[0];
}

export async function createPasswordResetToken(userId: number) {
  const token = randomBytes(32).toString("base64url");
  const hash = createHash("sha256").update(token).digest("hex");

  await pool.query(
    `DELETE FROM password_reset_tokens
    WHERE user_id = $1 AND used_at IS NULL`,
    [userId],
  );

  const result = await pool.query(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
    VALUES($1, $2, now() + interval '30minutes')
    RETURNING expires_at`,
    [userId, hash],
  );

  return {
    token,
    expiresAt: result.rows[0].expires_at,
  };
}
