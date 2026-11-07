import * as argon2 from "argon2";

import { pool } from "../database";

export type UserRole = {
    id: number,
    role: 'teacher' | 'student'
}

type User = {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  role: "student" | "teacher";
};

export async function addUser(name: string, email: string, password: string) {
  const password_hash = await argon2.hash(password);

  const result = await pool.query(
    "INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) ON CONFLICT (email) DO NOTHING RETURNING id, name, email",
    [name, email, password_hash],
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}

export async function findUserByEmail(email: string) {
  const result = await pool.query("SELECT id, name, email, password_hash, role FROM users WHERE email = $1", [
    email,
  ]);

  return result.rows[0];
}

export async function findUserById(id: number) {
  const result = await pool.query<UserRole>(`SELECT id, role FROM users WHERE id = $1`, [id])
  return result.rows[0]
}