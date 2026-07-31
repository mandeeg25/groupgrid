/**
 * Grant a user complimentary access — inserts into comped_users, which
 * getSubscriptionAccess() checks before ever looking at Stripe. Bypasses the
 * subscription check entirely; no Stripe customer/subscription is created.
 *
 * The user must already have a Supabase Auth account (signed up through the
 * app at least once) — this looks their id up by email against auth.users
 * in the same database, so you don't have to go find the uuid by hand.
 *
 * Usage:
 *   node scripts/add-comped-user.mjs --email=her@client.com --note="site owner"
 *   node scripts/add-comped-user.mjs --id=<uuid> --note="..."   # skip the email lookup
 *   node scripts/add-comped-user.mjs --email=... --env=.env.prod
 *   node scripts/add-comped-user.mjs --email=... --url="postgres://..."
 *
 * Safe to re-run: re-comping the same person updates their note instead of erroring.
 */

import fs from "node:fs";
import path from "node:path";
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

function fail(msg) {
  console.error(`\n  ${msg}\n`);
  process.exit(1);
}

const email = argOf("email");
const id = argOf("id");
const note = argOf("note") || null;
if (!email && !id) fail("Pass --email=<address> (or --id=<uuid> if you already have it).");

// ── env — .env.local wins over .env, matching the rest of the repo ─────────
const envFile = argOf("env");
if (envFile) {
  const p = path.resolve(repoRoot, envFile);
  if (!fs.existsSync(p)) fail(`env file not found: ${p}`);
  dotenv.config({ path: p });
} else {
  dotenv.config({ path: path.join(repoRoot, ".env.local") });
  dotenv.config({ path: path.join(repoRoot, ".env") });
}

const url = argOf("url") || process.env.DATABASE_URL;
if (!url) fail("DATABASE_URL is not set. Pass --url=... or --env=<file>, or set it in .env.local");

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

console.log(`\n  target  ${describeTarget(url)}`);

try {
  let userId = id;
  let userEmail = email;

  if (!userId) {
    const [user] = await sql`select id, email from auth.users where lower(email) = lower(${email})`;
    if (!user) {
      fail(`No auth user found for ${email} — they need to sign up in the app at least once first.`);
    }
    userId = user.id;
    userEmail = user.email;
  }

  const [row] = await sql`
    insert into comped_users (id, note)
    values (${userId}, ${note})
    on conflict (id) do update set note = excluded.note
    returning id, note, created_at
  `;

  console.log(`  ${userEmail ? `${userEmail} ` : ""}(${row.id}) now has complimentary access.`);
  if (row.note) console.log(`  note: ${row.note}`);
  console.log("");

  await sql.end({ timeout: 5 });
} catch (err) {
  await sql.end({ timeout: 5 }).catch(() => {});
  fail(`Could not grant access: ${err.message}`);
}
