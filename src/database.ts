import "dotenv/config";
import { Pool } from "pg";

export const pool = new Pool({ connectionTimeoutMillis: 5000 });
