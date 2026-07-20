# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```
npm run dev          # Vite dev server
npm run build        # production build to dist/
npm run preview      # serve the production build locally
npm run db:generate  # drizzle-kit generate — create a new migration from db/schema.ts
npm run db:migrate   # drizzle-kit migrate — apply migrations to DATABASE_URL
```

There is no lint script and no automated test suite (no test runner is installed). `test-data/` contains a hand-verified 5-file cross-check scenario (`test-data/README.md` documents the expected flag per guest) for manually exercising the parsing/cross-check engine — regenerate the fixtures with `node test-data/generate-test-data.mjs` if the schema of the sample sheets needs to change.

For local API/backend work, `.env.example` documents every environment variable; copy to `.env.local`. The `VITE_` prefix is load-bearing — only `VITE_`-prefixed vars are bundled into the client build, everything else is server-only and must never be referenced from `src/`.

## Architecture

This is two applications sharing one repo and one Vercel deployment:

1. **The product** — a client-side React SPA (Vite) that cross-checks event-guest data across up to six uploaded spreadsheet types (registration, flights, hotels, car transfers, dietary/accessibility, abstract submissions). This is the original app (migrated from CRA to Vite in branch `1-migrate-vite`, then split from one giant file into modules in `2-split-into-modules`) and it does **not** use a database — all event data lives in browser memory/localStorage and never touches the server. There's no client-side router; `constants.js`'s `PAGE_PATHS`/`pathToPage` map URL paths to a page enum that `GroupGridResults.jsx` switches on directly.
2. **A billing/auth layer** bolted on afterward (`api/`, `db/`) purely to gate access to (1) behind a Stripe subscription. This is the only part of the app that talks to a real backend/database.

### The cross-check engine (the actual product)
`src/parsing/parseSheets.js` parses each uploaded `.xlsx` via fuzzy header matching (`findCol` in `src/format.js` tries a list of candidate header spellings per field — e.g. a hotel checkout column might be labeled "Check-out", "checkout", or "Departure") into a normalized record shape per source type. `src/parsing/crossMatch.js` (`crossMatch()`) joins those records by matched guest (name/email fuzzy matching), then runs a fixed set of rules against each joined guest producing `{ type, text }` issue entries — missing records, date mismatches against registration requests, outside-travel-window, wrong-preferred-airport, late-arrival cutoffs, duplicate entries, attendee-type arrival-day rules, unregistered-but-booked, accepted-abstract-but-not-registered. `GroupGridResults.jsx` (~1900 lines — the entire post-login app: grid, summary, Communications Hub, reporting/export, session save/load) is the sole consumer of these results; almost everything else in `src/components/` is a modal or subview it drives directly, and `src/pdf/loadPdfJs.js` lets a PDF (e.g. a flight itinerary) be treated as an additional upload source. All of this runs entirely client-side — there is no server-side validation of any guest data, so the client should be told the report's numbers are only as trustworthy as whoever's browser produced them (see `docs/security-audit.md` §4).

Report/export generation (`ShareModal.jsx`, `generateShareableReport()` in `GroupGridResults.jsx`) builds a standalone downloadable HTML file by string concatenation — any field interpolated into that HTML must go through the local `esc()` helper, since the data originates from uploaded spreadsheets (untrusted input) and the exported file has no sandboxing once downloaded.

### Auth
Supabase Auth, loaded via a CDN `<script>` tag at runtime in `App.jsx` (not the npm package) — `src/auth/supabaseClient.js` wraps `window.supabase.createClient()`. `VITE_SUPABASE_URL`/`VITE_SUPABASE_KEY` are the publishable anon key, safe to expose (RLS is what actually protects data, not key secrecy). Server-side, `api/_lib/auth.ts` verifies the JWT independently against Supabase's JWKS endpoint (asymmetric, no shared secret) via `jose`, checking issuer + `audience: "authenticated"`; every `/api` route that needs a user calls `getAuthedUser(req)` and 401s if it returns null.

### Billing (`api/`, `db/`)
Drizzle ORM + `postgres` over Supabase's transaction-mode pooler (`DATABASE_URL`, port 6543 — `prepare:false` is required in this mode, see `db/client.ts`). Schema (`db/schema.ts`): `customers` (Stripe customer per Supabase user id — logical FK only, Drizzle doesn't manage the `auth` schema), `subscriptions` (one Stripe subscription tier currently), `webhook_events` (idempotency log — Stripe redelivers events), `comped_users` (manual bypass for special-cased accounts, inserted by hand via SQL, no UI). All four tables call `.enableRLS()` with **zero policies defined** — this is deliberate: Supabase auto-exposes every `public` table through its REST Data API using the anon key, and RLS-with-no-policies is what fully blocks that path while leaving Drizzle's own direct Postgres connection (table owner) untouched. Don't add RLS policies to these tables without understanding this is the only thing standing between the anon key and raw read/write access.

`api/_lib/subscriptionAccess.ts`'s `getSubscriptionAccess()` is the single source of truth for "does this user get in" — shared by `api/subscription.ts` (the UI gate) and `api/stripe/checkout.ts` (to redirect an already-subscribed user to the billing portal instead of double-subscribing). `active`, `trialing`, and `past_due` all count as having access — `past_due` is intentionally lenient to survive Stripe's payment-retry window rather than lock out on the first declined charge.

`api/stripe/webhook.ts` verifies the Stripe signature via `stripe.webhooks.constructEvent` and requires the raw request body (`api/_lib/rawBody.ts` bypasses Vercel's default JSON body parsing — don't add a body parser in front of this route). `vercel.json`'s SPA rewrite explicitly excludes `/api/*` (`"source": "/((?!api/).*)"`) — if that exclusion is ever removed, every API route silently starts returning the SPA shell instead of running.

### Environments and branching
Numbered feature branches (`1-migrate-vite`, `2-split-into-modules`, ...) merge into `development`, which auto-deploys to a staging Vercel project via `.github/workflows/deploy-staging.yml` (a GitHub Action using `VERCEL_TOKEN_STAGING`/`VERCEL_ORG_ID_STAGING`/`VERCEL_PROJECT_ID_STAGING` secrets). `main` is the client's production project and deploys through their own separate Vercel↔GitHub integration — a mechanism this repo's CI can't dry-run. Staging and production are fully separate Supabase projects, Vercel projects, and Stripe accounts (test mode vs. live mode) with independent env vars, price IDs, and webhook signing secrets. `docs/merge-to-main-checklist.md` is the gate for promoting `development` → `main`; check it before that merge, since several steps require client-side dashboard access this repo's owner doesn't have standing access to.

### Dependency quirks worth knowing before touching `package.json`
- `xlsx` is installed from `https://cdn.sheetjs.com/xlsx-0.20.2/xlsx-0.20.2.tgz`, not the npm registry — the npm-published `xlsx` package is stuck on an old, unpatched version (SheetJS moved fixes off npm). Don't "fix" this back to a bare npm version string.
- `overrides` pins `js-yaml`/`smol-toml`, two packages nested inside `@vercel/node`'s own dependency tree (used only for Vercel's Python build-analysis, irrelevant to this JS/TS app) that `npm audit fix` can't reach otherwise.
- See `docs/security-audit.md` for the full rationale and current `npm audit` posture, and `docs/production-checklist.md` for the Supabase/Stripe dashboard settings that need verifying before/at go-live (these live outside the codebase and can't be checked by reading source).
