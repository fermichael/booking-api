import { Pool } from "pg";

import "dotenv/config";

export const pool = new Pool({ connectionTimeoutMillis: 5000 });
