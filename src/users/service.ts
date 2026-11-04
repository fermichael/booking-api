import * as argon2 from "argon2";

import { pool } from "../database";

type User = {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  role: "student" | "teacher";
};

export async function addUser(name: string, email: string, password: string) {
  const password_hash = await argon2.hash(password);

  const result = await pool.query<Pick<User, "id" | "name" | "email">>(
    "INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) ON CONFLICT (email) DO NOTHING RETURNING id, name, email",
    [name, email, password_hash],
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}

export async function findUserByEmail(email: string): Promise<User | undefined> {
  const result = await pool.query<User>("SELECT id, name, email, password_hash, role FROM users WHERE email = $1", [
    email,
  ]);

  return result.rows[0];
}
