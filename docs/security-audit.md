# GroupGrid Security Audit

Conducted 2026-07-20 against the current codebase and deployment architecture (Vercel + Supabase + Stripe).

## 1. Findings

### 🟠 Medium — Unescaped HTML injection in the shareable report export — **Mitigated 2026-07-20**
`generateShareableReport()` in [`src/GroupGridResults.jsx`](../src/GroupGridResults.jsx) built the exported report by string-concatenating guest data directly into HTML (guest names, notes, issue text, airport codes, dietary/accessibility fields, hotel/travel contact info, planner name, event name) with no escaping. That data originates from uploaded guest-list spreadsheets and free-text fields — attacker-influenceable input.

- The in-app preview iframe uses `sandbox="allow-same-origin"` *without* `allow-scripts`, so injected scripts didn't execute there.
- The "Download HTML File" button saved the same unescaped HTML as a standalone `.html` file with no sandbox at all. Opened directly (the file's entire purpose — sharing with hotels/vendors), any injected script would execute in that file's own context.

**Fix:** added an `esc()` HTML-escaping helper and applied it to every field sourced from spreadsheets or free text before it's embedded in the report HTML. Verified against `<script>` and quote-breakout payloads. Both the in-app preview and the downloaded file now render any injected markup as inert text.

### 🟠 Medium — `xlsx` package, known high-severity vulnerability, no fix on npm — **Mitigated 2026-07-20**
`npm audit` flagged prototype pollution and ReDoS in `xlsx@0.18.5`, both high severity, `fixAvailable: false`. This library parses user-uploaded spreadsheet files at runtime — exactly the kind of input an attacker would target. The npm-registry package is abandoned by the maintainer (SheetJS moved to a paid model); no patch was coming through npm.

**Fix:** swapped to SheetJS's own patched build, `xlsx@0.20.2` installed directly from `cdn.sheetjs.com` (SheetJS's own documented remediation for this situation). Confirmed via `npm audit` that `xlsx` no longer appears in the vulnerability list at all. No code changes needed — same package name and API; all four import sites (`templatesDownload.js`, `GroupGridResults.jsx`, `parseSheets.js`, `loadPdfJs.js`) work unchanged.

### 🟡 Low/process — Live secrets passed through chat in plaintext
Over the course of development, real values were pasted into chat: Stripe test secret key, Supabase secret key, the pooler `DATABASE_URL` (with embedded DB password), and webhook signing secrets. Confirmed via git history that none of these ever touched a commit — `.env` has been gitignored throughout, and history is clean.

**Recommendation:** rotate all of them (Stripe secret key, Supabase secret/JWT signing key, DB password) as routine hygiene — not because of a known compromise, just because a value pasted into a chat transcript shouldn't be treated as long-lived.

## 2. Other security-relevant fixes made during development (branches 1–11, pre-audit)

Reviewed the full commit history across branches `1-migrate-vite` through `11-redirect-curr-sub-billing` (all merged into `development`, not yet into `main`) for anything else that was found and corrected before this audit. Two real gaps turned up, both caught and closed by the team during the same work rather than left for later:

### RLS was not on by default when the new tables were first created
When the `customers`, `subscriptions`, and `webhook_events` tables were first added (`5-drizzle-schema-and-migration`, commit `fbe5891`), they were created without row-level security. Supabase auto-exposes every table in the `public` schema through its REST Data API using the anon/publishable key **by default** — so as created, these tables would have been readable/writable by anyone with the (client-side, non-secret) publishable key, no auth required.

This was caught within the same branch, before any deployment to an environment with real data: commit `635b4ae` (`turn on RLS for supabase auth`) added `.enableRLS()` to each table in `db/schema.ts` and bundled the `ENABLE ROW LEVEL SECURITY` statements into the migration itself, so enabling RLS isn't a separate manual step someone could forget when running migrations against a new environment. `comped_users` (added later, `10-gate-app-subscription`) had RLS on from its first commit. Net effect: by the time any of this reached staging or production, RLS was already in place — see [Section 3](#3-reviewed-and-confirmed-solid) for current verified state.

### The SPA rewrite would have swallowed every `/api` request
`vercel.json`'s rewrite rule has existed since the very first Vite migration commit to route unmatched paths to the SPA shell (needed for client-side routing). Its original form, `{ "source": "/(.*)", "destination": "/" }`, is a catch-all with no exclusions — harmless while no `/api` routes existed yet, but it would have redirected *every* request, including future API calls, to `index.html` instead of reaching a serverless function.

This was corrected in the same commit that introduced the first API routes (`6-api-stripe-checkout`, commit `c57ab4a`), changing the rule to `{ "source": "/((?!api/).*)", "destination": "/" }`, which explicitly excludes `/api/*`. Confirmed this is still the current rule (see Section 3) — all the auth/webhook verification built on top of these routes only matters because this routing is correct underneath it.

### Gitignore hardening for env files and local tooling state
`.gitignore` was introduced in the very first commit of the Vite migration/backend work (`1-migrate-vite`, commit `30c1aad`) and already included `.env` and `.env.local` at that point — there was never a period in this repo's history where env files existed untracked. It was tightened twice as the project grew: broadened from `.env`/`.env.local` to `.env*` (catching `.env.production`, `.env.staging`, etc.) and `.vercel` was added (local project/org linkage files) in commit `ea33996`. Confirmed via full-history `git log` that no `.env*` file has ever been committed to any branch.

## 3. Reviewed and confirmed solid

- **RLS**: `customers`, `subscriptions`, `webhook_events`, `comped_users` all have `ENABLE ROW LEVEL SECURITY` with zero policies defined (confirmed in `drizzle/0001_cool_sentinel.sql` and `drizzle/0002_clear_lady_ursula.sql`) — this fully blocks the PostgREST/Data API from the anon or authenticated role; only the direct server-side Postgres connection (table owner) can touch these tables. The client SDK is never used for direct table queries, only `auth.*`.
- **Auth verification**: `api/_lib/auth.ts` verifies Supabase JWTs against the project's JWKS (asymmetric — no shared secret needed server-side), checks both `issuer` and `audience: "authenticated"`, and fails closed (any verification error → treated as unauthenticated).
- **API auth gating**: every `/api` route touching billing/subscription data (`checkout.ts`, `portal.ts`, `subscription.ts`) calls `getAuthedUser` first and 401s before doing anything else.
- **Stripe webhook**: signature verified via `stripe.webhooks.constructEvent`, raw body handling correctly bypasses Vercel's JSON auto-parsing, events deduped through a `webhook_events` insert for idempotency.
- **Secrets discipline**: no `VITE_`-prefixed secret keys; grepped tracked source for `sk_live_`, `sk_test_`, `sb_secret_`, `whsec_`, and embedded Postgres passwords — nothing found. Server-only secrets (`STRIPE_SECRET_KEY`, `SUPABASE_SECRET_KEY`, `DATABASE_URL`, `STRIPE_WEBHOOK_SECRET`) are never read anywhere in client-bundled code.
- **`vercel.json`**: the SPA rewrite explicitly excludes `/api/*` (`"source": "/((?!api/).*)"`), so API routes can't be silently swallowed by the catch-all.
- **SQL injection**: all database access goes through Drizzle's parameterized query builder (`eq()`, `.where()`, etc.) — no raw string-built SQL anywhere in `api/` or `db/`.
- **Environment isolation**: separate Vercel projects/accounts for staging vs. production, separate Stripe test/live keys, separate Supabase projects.

## 4. Disclosures worth stating explicitly (not vulnerabilities)

- **`npm audit` remaining totals** (after the `xlsx` fix): 8 moderate, 6 high, 0 critical. All remaining high-severity items are in the build/dev toolchain (`@vercel/node`, `@vercel/build-utils`, `path-to-regexp`, `undici`, `minimatch`, etc.) — these run at build/deploy time or in the CLI, never in the shipped browser bundle or the deployed serverless functions' request path. Worth a `npm audit fix` pass since fixes are available for all of them.
- **No custom rate limiting**: `/api/stripe/checkout`, `/portal`, `/subscription` have no application-level throttling of their own — they rely on Stripe's and Vercel's platform-level protections. Fine at current scale, but worth disclosure.
- **Client-side-only cross-check engine**: the guest-list matching/validation logic runs entirely in the browser. Not a vulnerability — there's no sensitive data at stake since it's the user's own uploaded data — but the client should understand anyone with browser dev tools could alter what the UI reports before deciding to export/email it.
- **`past_due` subscribers keep access**: intentional design (`api/_lib/subscriptionAccess.ts`) to survive Stripe's payment retry window rather than lock out on first decline — a deliberate leniency, not a bug.
