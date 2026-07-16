import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

// Connects via Supabase's transaction-mode pooler (DATABASE_URL, port 6543).
// prepare:false is required in transaction-pooling mode — the pooler doesn't
// support session-level prepared statements across requests.
const client = postgres(process.env.DATABASE_URL, { prepare: false });

export const db = drizzle(client, { schema });
