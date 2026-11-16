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

  const result = await pool.query(
    `WITH deleted AS (
      DELETE FROM password_reset_tokens
      WHERE user_id = $1 AND used_at IS NOT NULL
    )
    INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
    VALUES ($1, $2, now() + interval '30 minutes')
    ON CONFLICT (user_id) WHERE used_at IS NULL
    DO UPDATE SET
      token_hash = EXCLUDED.token_hash,
      expires_at = EXCLUDED.expires_at,
      created_at = now()
    RETURNING expires_at`,
    [userId, hash],
  );

  return {
    token,
    expiresAt: result.rows[0].expires_at,
  };
}

export async function resetPasswordWithToken(token: string, password: string) {
  const hash = createHash("sha256").update(token).digest("hex");

  const activeToken = await pool.query(
    `SELECT 1 FROM password_reset_tokens
    WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()`,
    [hash],
  );

  if (activeToken.rows.length === 0) {
    return false;
  }

  const password_hash = await argon2.hash(password);

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const claimedToken = await client.query<{ user_id: number }>(
      `UPDATE password_reset_tokens
      SET used_at = now()
      WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()
      RETURNING user_id`,
      [hash],
    );

    if (claimedToken.rows.length === 0) {
      await client.query("ROLLBACK");
      return false;
    }

    const userId = claimedToken.rows[0].user_id;

    await client.query("UPDATE users SET password_hash = $1 WHERE id = $2", [
      password_hash,
      userId,
    ]);

    await client.query("DELETE FROM sessions WHERE (sess->>'userId')::int = $1", [userId]);

    await client.query("COMMIT");

    return true;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
