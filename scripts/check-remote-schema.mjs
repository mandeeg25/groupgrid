/**
 * Read-only schema check against a remote database.
 *
 * Verifies that what actually exists in the target Postgres matches what
 * db/schema.ts + drizzle/ say should exist. Written for the case where you
 * ran `npm run db:migrate` at production and have no dashboard access to
 * confirm it landed.
 *
 * Usage:
 *   node scripts/check-remote-schema.mjs                  # uses DATABASE_URL from .env / .env.local
 *   node scripts/check-remote-schema.mjs --env=.env.prod  # load a specific env file
 *   node scripts/check-remote-schema.mjs --url="postgres://..."
 *   node scripts/check-remote-schema.mjs --json           # machine-readable output
 *
 * Runs only SELECTs against information_schema / pg_catalog and
 * drizzle.__drizzle_migrations. It never writes, and never prints the password.
 * Exits 0 if the remote matches, 1 if anything is missing or different.
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

// ── args ────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const argOf = (name) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
};
const asJson = args.includes("--json");

// ── expected shape, transcribed from db/schema.ts ───────────────────────────
// udtName is Postgres' internal type name: timestamp-without-tz is "timestamp",
// boolean is "bool", an enum column is the enum's own name.
const EXPECTED_ENUMS = {
  subscription_status: [
    "trialing",
    "active",
    "past_due",
    "canceled",
    "unpaid",
    "incomplete",
    "incomplete_expired",
    "paused",
  ],
};

const EXPECTED_TABLES = {
  customers: {
    columns: {
      id: { udtName: "uuid", nullable: false, hasDefault: false },
      stripe_customer_id: { udtName: "text", nullable: false, hasDefault: false },
      created_at: { udtName: "timestamp", nullable: false, hasDefault: true },
    },
    primaryKey: ["id"],
    unique: [["stripe_customer_id"]],
    foreignKeys: [],
  },
  subscriptions: {
    columns: {
      id: { udtName: "text", nullable: false, hasDefault: false },
      customer_id: { udtName: "uuid", nullable: false, hasDefault: false },
      status: { udtName: "subscription_status", nullable: false, hasDefault: false },
      price_id: { udtName: "text", nullable: false, hasDefault: false },
      current_period_end: { udtName: "timestamp", nullable: false, hasDefault: false },
      cancel_at_period_end: { udtName: "bool", nullable: false, hasDefault: true },
      created_at: { udtName: "timestamp", nullable: false, hasDefault: true },
      updated_at: { udtName: "timestamp", nullable: false, hasDefault: true },
    },
    primaryKey: ["id"],
    unique: [],
    foreignKeys: [{ columns: ["customer_id"], refTable: "customers", refColumns: ["id"] }],
  },
  webhook_events: {
    columns: {
      id: { udtName: "text", nullable: false, hasDefault: false },
      type: { udtName: "text", nullable: false, hasDefault: false },
      payload: { udtName: "jsonb", nullable: true, hasDefault: false },
      processed_at: { udtName: "timestamp", nullable: false, hasDefault: true },
    },
    primaryKey: ["id"],
    unique: [],
    foreignKeys: [],
  },
  comped_users: {
    columns: {
      id: { udtName: "uuid", nullable: false, hasDefault: false },
      note: { udtName: "text", nullable: true, hasDefault: false },
      created_at: { udtName: "timestamp", nullable: false, hasDefault: true },
    },
    primaryKey: ["id"],
    unique: [],
    foreignKeys: [],
  },
};

// ── env ─────────────────────────────────────────────────────────────────────
const envFile = argOf("env");
if (envFile) {
  const p = path.resolve(repoRoot, envFile);
  if (!fs.existsSync(p)) fail(`env file not found: ${p}`);
  dotenv.config({ path: p });
} else {
  // .env.local wins over .env, matching how the rest of the repo is set up.
  dotenv.config({ path: path.join(repoRoot, ".env.local") });
  dotenv.config({ path: path.join(repoRoot, ".env") });
}

const url = argOf("url") || process.env.DATABASE_URL;
if (!url) {
  fail("DATABASE_URL is not set. Pass --url=... or --env=<file>, or set it in .env.local");
}

function fail(msg) {
  console.error(`\n  ${msg}\n`);
  process.exit(1);
}

// Describe the target without ever echoing the password.
function describeTarget(connStr) {
  try {
    const u = new URL(connStr);
    return `${u.username}@${u.hostname}:${u.port || 5432}${u.pathname}`;
  } catch {
    return "(unparseable connection string)";
  }
}

const isLocal = /@(localhost|127\.0\.0\.1)/.test(url);
const sql = postgres(url, {
  prepare: false, // required in Supabase transaction-pooling mode (port 6543)
  max: 1,
  idle_timeout: 5,
  connect_timeout: 15,
  ...(isLocal ? {} : { ssl: "require" }),
  onnotice: () => {},
});

// ── introspection queries ───────────────────────────────────────────────────
async function introspect() {
  const [version] = await sql`select version() as v, current_database() as db`;

  const columns = await sql`
    select table_name, column_name, udt_name, is_nullable,
           column_default, ordinal_position
      from information_schema.columns
     where table_schema = 'public'
     order by table_name, ordinal_position
  `;

  const tables = await sql`
    select c.relname as table_name, c.relrowsecurity as rls_enabled
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'r'
     order by c.relname
  `;

  const constraints = await sql`
    select con.conname as name,
           con.contype as type,
           rel.relname as table_name,
           ref.relname as ref_table,
           pg_get_constraintdef(con.oid) as definition
      from pg_constraint con
      join pg_class rel on rel.oid = con.conrelid
      join pg_namespace n on n.oid = rel.relnamespace
      left join pg_class ref on ref.oid = con.confrelid
     where n.nspname = 'public'
     order by rel.relname, con.contype, con.conname
  `;

  const policies = await sql`
    select tablename, policyname from pg_policies where schemaname = 'public'
  `;

  const enums = await sql`
    select t.typname as name, e.enumlabel as value
      from pg_type t
      join pg_enum e on e.enumtypid = t.oid
      join pg_namespace n on n.oid = t.typnamespace
     where n.nspname = 'public'
     order by t.typname, e.enumsortorder
  `;

  // drizzle's own bookkeeping table — absent if no migration has ever run here
  let migrations = null;
  const [{ exists: hasMigrationsTable }] = await sql`
    select exists (
      select 1 from information_schema.tables
       where table_schema = 'drizzle' and table_name = '__drizzle_migrations'
    ) as exists
  `;
  if (hasMigrationsTable) {
    migrations = await sql`
      select id, hash, created_at
        from drizzle.__drizzle_migrations
       order by created_at
    `;
  }

  return { version, columns, tables, constraints, policies, enums, migrations, hasMigrationsTable };
}

// ── comparison ──────────────────────────────────────────────────────────────
function compare(remote) {
  const problems = [];
  const notes = [];

  const byTable = new Map();
  for (const c of remote.columns) {
    if (!byTable.has(c.table_name)) byTable.set(c.table_name, new Map());
    byTable.get(c.table_name).set(c.column_name, c);
  }
  const rlsByTable = new Map(remote.tables.map((t) => [t.table_name, t.rls_enabled]));

  // enums
  const enumValues = {};
  for (const row of remote.enums) {
    (enumValues[row.name] ||= []).push(row.value);
  }
  for (const [name, expected] of Object.entries(EXPECTED_ENUMS)) {
    const actual = enumValues[name];
    if (!actual) {
      problems.push(`enum "${name}" is missing`);
    } else if (actual.join(",") !== expected.join(",")) {
      problems.push(
        `enum "${name}" values differ\n      expected: ${expected.join(", ")}\n      actual:   ${actual.join(", ")}`
      );
    }
  }

  // tables + columns
  for (const [table, spec] of Object.entries(EXPECTED_TABLES)) {
    const cols = byTable.get(table);
    if (!cols) {
      problems.push(`table "${table}" is missing`);
      continue;
    }

    for (const [col, expected] of Object.entries(spec.columns)) {
      const actual = cols.get(col);
      if (!actual) {
        problems.push(`${table}.${col} is missing`);
        continue;
      }
      if (actual.udt_name !== expected.udtName) {
        problems.push(
          `${table}.${col} type is "${actual.udt_name}", expected "${expected.udtName}"`
        );
      }
      const actualNullable = actual.is_nullable === "YES";
      if (actualNullable !== expected.nullable) {
        problems.push(
          `${table}.${col} is ${actualNullable ? "nullable" : "NOT NULL"}, expected ${expected.nullable ? "nullable" : "NOT NULL"}`
        );
      }
      const actualHasDefault = actual.column_default !== null;
      if (actualHasDefault !== expected.hasDefault) {
        problems.push(
          `${table}.${col} ${actualHasDefault ? `has default "${actual.column_default}"` : "has no default"}, expected ${expected.hasDefault ? "a default" : "no default"}`
        );
      }
    }

    for (const col of cols.keys()) {
      if (!spec.columns[col]) {
        notes.push(`${table}.${col} exists remotely but is not in db/schema.ts`);
      }
    }

    // constraints for this table
    const tableCons = remote.constraints.filter((c) => c.table_name === table);
    const pk = tableCons.find((c) => c.type === "p");
    if (!pk) {
      problems.push(`${table} has no primary key (expected on ${spec.primaryKey.join(", ")})`);
    } else if (!spec.primaryKey.every((c) => pk.definition.includes(c))) {
      problems.push(`${table} primary key is ${pk.definition}, expected on (${spec.primaryKey.join(", ")})`);
    }

    for (const uq of spec.unique) {
      const found = tableCons.some(
        (c) => c.type === "u" && uq.every((col) => c.definition.includes(col))
      );
      if (!found) problems.push(`${table} is missing a UNIQUE constraint on (${uq.join(", ")})`);
    }

    for (const fk of spec.foreignKeys) {
      const found = tableCons.some(
        (c) =>
          c.type === "f" &&
          c.ref_table === fk.refTable &&
          fk.columns.every((col) => c.definition.includes(col))
      );
      if (!found) {
        problems.push(
          `${table} is missing FK (${fk.columns.join(", ")}) -> ${fk.refTable}(${fk.refColumns.join(", ")})`
        );
      }
    }

    // RLS: every table calls .enableRLS() with zero policies on purpose —
    // that's what blocks Supabase's auto-exposed REST Data API. See CLAUDE.md.
    if (rlsByTable.get(table) !== true) {
      problems.push(
        `${table} does NOT have row level security enabled — the Supabase anon key can reach it via the REST Data API`
      );
    }
    const tablePolicies = remote.policies.filter((p) => p.tablename === table);
    if (tablePolicies.length > 0) {
      notes.push(
        `${table} has ${tablePolicies.length} RLS ${tablePolicies.length === 1 ? "policy" : "policies"} (${tablePolicies.map((p) => p.policyname).join(", ")}) — schema.ts expects zero`
      );
    }
  }

  return { problems, notes };
}

// ── migration journal comparison ────────────────────────────────────────────
function compareMigrations(remote) {
  const journalPath = path.join(repoRoot, "drizzle", "meta", "_journal.json");
  const journal = JSON.parse(fs.readFileSync(journalPath, "utf8"));

  const local = journal.entries.map((e) => {
    const sqlPath = path.join(repoRoot, "drizzle", `${e.tag}.sql`);
    const contents = fs.existsSync(sqlPath) ? fs.readFileSync(sqlPath) : null;
    return {
      tag: e.tag,
      when: Number(e.when),
      // drizzle hashes the raw .sql file contents with sha256
      hash: contents ? crypto.createHash("sha256").update(contents.toString()).digest("hex") : null,
    };
  });

  const applied = (remote.migrations || []).map((m) => ({
    hash: m.hash,
    when: Number(m.created_at),
  }));

  const rows = local.map((l) => {
    const match = applied.find((a) => a.when === l.when);
    return {
      tag: l.tag,
      applied: Boolean(match),
      hashMatches: match ? match.hash === l.hash : null,
    };
  });

  const extra = applied.filter((a) => !local.some((l) => l.when === a.when));
  return { rows, extra, appliedCount: applied.length };
}

// ── output ──────────────────────────────────────────────────────────────────
function report(remote, diff, mig) {
  const g = (s) => `\x1b[32m${s}\x1b[0m`;
  const r = (s) => `\x1b[31m${s}\x1b[0m`;
  const y = (s) => `\x1b[33m${s}\x1b[0m`;
  const dim = (s) => `\x1b[2m${s}\x1b[0m`;

  console.log(`\n  ${dim("target")}  ${describeTarget(url)}`);
  console.log(`  ${dim("server")}  ${remote.version.v.split(" ").slice(0, 2).join(" ")}\n`);

  console.log("  Migrations");
  if (!remote.hasMigrationsTable) {
    console.log(`    ${r("x")} drizzle.__drizzle_migrations does not exist — no migration has ever run here`);
  } else {
    for (const row of mig.rows) {
      if (!row.applied) console.log(`    ${r("x")} ${row.tag} ${dim("not applied")}`);
      else if (row.hashMatches === false)
        console.log(`    ${y("!")} ${row.tag} ${dim("applied, but the local .sql file has changed since")}`);
      else console.log(`    ${g("v")} ${row.tag}`);
    }
    for (const e of mig.extra) {
      console.log(`    ${y("!")} unknown migration applied remotely (ts ${e.when}) with no local counterpart`);
    }
  }

  console.log("\n  Tables");
  for (const table of Object.keys(EXPECTED_TABLES)) {
    const t = remote.tables.find((x) => x.table_name === table);
    if (!t) {
      console.log(`    ${r("x")} ${table} ${dim("missing")}`);
      continue;
    }
    const colCount = remote.columns.filter((c) => c.table_name === table).length;
    const policyCount = remote.policies.filter((p) => p.tablename === table).length;
    console.log(
      `    ${g("v")} ${table.padEnd(16)} ${dim(`${colCount} cols`)}  ${t.rls_enabled ? g("RLS on") : r("RLS OFF")}  ${dim(`${policyCount} policies`)}`
    );
  }

  // Tables not in schema.ts still matter: anything in `public` without RLS is
  // readable/writable through Supabase's auto-exposed REST API using the anon key.
  const otherTables = remote.tables.filter((t) => !EXPECTED_TABLES[t.table_name]);
  if (otherTables.length) {
    console.log(`\n  Other tables in public schema ${dim("(not managed by db/schema.ts)")}`);
    for (const t of otherTables) {
      const policyCount = remote.policies.filter((p) => p.tablename === t.table_name).length;
      console.log(
        `    ${t.rls_enabled ? g("v") : r("x")} ${t.table_name.padEnd(16)} ${t.rls_enabled ? g("RLS on") : r("RLS OFF — reachable with the anon key")}  ${dim(`${policyCount} policies`)}`
      );
    }
  }

  if (diff.notes.length) {
    console.log("\n  Notes");
    for (const n of diff.notes) console.log(`    ${y("!")} ${n}`);
  }

  console.log("");
  if (diff.problems.length === 0) {
    console.log(`  ${g("Remote schema matches db/schema.ts.")}\n`);
  } else {
    console.log(`  ${r(`${diff.problems.length} mismatch(es):`)}`);
    for (const p of diff.problems) console.log(`    ${r("x")} ${p}`);
    console.log("");
  }
}

// ── main ────────────────────────────────────────────────────────────────────
try {
  const remote = await introspect();
  const diff = compare(remote);
  const mig = compareMigrations(remote);

  const migrationsOk =
    remote.hasMigrationsTable && mig.rows.every((row) => row.applied);

  if (asJson) {
    console.log(
      JSON.stringify(
        {
          target: describeTarget(url),
          ok: diff.problems.length === 0 && migrationsOk,
          problems: diff.problems,
          notes: diff.notes,
          migrations: mig.rows,
          extraMigrations: mig.extra,
          tables: remote.tables,
          columns: remote.columns,
          constraints: remote.constraints,
          policies: remote.policies,
          enums: remote.enums,
        },
        null,
        2
      )
    );
  } else {
    report(remote, diff, mig);
  }

  await sql.end({ timeout: 5 });
  process.exit(diff.problems.length === 0 && migrationsOk ? 0 : 1);
} catch (err) {
  await sql.end({ timeout: 5 }).catch(() => {});
  fail(`Could not read the remote schema: ${err.message}`);
}
