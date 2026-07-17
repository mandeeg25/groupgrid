# Checklist: before merging `development` into `main`

`main` auto-deploys to the client's production Vercel project via their existing Vercel↔GitHub integration — a different mechanism than our staging GitHub Action, and one we can't dry-run without access to their project. Treat this list as the gate before that merge.

## Blocking — needs client Vercel access

- [ ] **Set `VITE_SUPABASE_URL` / `VITE_SUPABASE_KEY` in the client's production Vercel project.** This is the big one: `src/auth/supabaseClient.js` no longer has a hardcoded fallback (see `docs/stripe-backend-plan.md`), so production auth breaks immediately on the next deploy if these aren't set first. Values are the original production project's: URL `https://ajabrqcbultkaszsycwh.supabase.co`, publishable key `sb_publishable_yn6mJb93k85y5nrJJReQSA_M6iliVoD`. **Publishable key only — never the secret key.**
- [ ] **Check the project's Framework Preset / Build & Development Settings.** The app was Create React App (output dir `build/`) and is now Vite (output dir `dist/`). If the client's Vercel project has these manually pinned rather than auto-detected, production will build the wrong thing (or fail) until this is corrected. Confirm framework preset reads "Vite" and output directory is `dist`.
- [ ] **Confirm the Node.js version** set on the client's project meets Vite 6's minimum (Node 18+). CRA was more lenient; an old pinned Node version could silently break the build.

## Blocking — needs client Stripe access

- [ ] **Recreate the two Products/Prices (monthly $250, annual $2,000) in the client's live-mode Stripe account.** Price IDs are account-specific — the test-mode IDs used on staging won't exist there. Set the resulting live Price IDs as `STRIPE_PRICE_ID_MONTHLY`/`STRIPE_PRICE_ID_ANNUAL` in the production Vercel project.
- [ ] **Set `STRIPE_SECRET_KEY` to the client's live-mode secret key (`sk_live_...`)** in the production Vercel project — never the test key.
- [ ] **Register a live-mode webhook endpoint** in the client's Stripe dashboard, pointed at `https://<production-domain>/api/stripe/webhook`, subscribed to whatever events the webhook handler processes (checkout completed, subscription updated/deleted, invoice payment failed — see `docs/stripe-backend-plan.md`). Copy the resulting **signing secret** into `STRIPE_WEBHOOK_SECRET` in the production Vercel project. This is separate from the test-mode webhook already registered against staging — each mode has its own endpoint and its own signing secret.

## Blocking — needs client Supabase access

- [ ] **Get the production Supabase project's `DATABASE_URL`** (transaction-mode pooler connection string, port 6543 — same format as staging's in `.env`) from the client, and run `npm run db:migrate` against it. This creates the `customers`/`subscriptions`/`webhook_events` tables **and** enables RLS on them in the same step — both migrations (`drizzle/0000_*.sql`, `drizzle/0001_*.sql`) already include the `ENABLE ROW LEVEL SECURITY` statements, so there's no separate manual RLS toggle needed as long as migrations are applied as-is. See `db/schema.ts` and the "Row-level security" discussion in this conversation for why RLS matters even though Drizzle's own connection bypasses it (Supabase auto-exposes every `public` table via its REST API using the publishable key — RLS with no policies blocks that path while leaving the direct Postgres connection untouched).
- [ ] **Confirm Auth → URL Configuration (Site URL / Redirect URLs) on the production Supabase project** points at the client's actual production domain. This should already be correct since production auth predates our changes, but worth explicitly confirming rather than assuming — especially since `signUp()` now passes `emailRedirectTo: window.location.origin` explicitly.
- [ ] **Spot-check that no other tables in the production project are exposed via the Data API** (Settings → Data API, or per-table RLS status) using the publishable key — the 3 new tables are covered by the migration above, but this is a good moment to confirm nothing pre-existing was left open.

## Code / build verification (can do now, no client access needed)

- [ ] `npm run build` succeeds cleanly from a fresh clone (not just this working copy) — catches anything accidentally left out of git.
- [ ] Confirm `.env`, `.env.local` are not committed (`git status` should show them untracked/ignored) — no secrets in the diff going to `main`.
- [ ] Re-run the manual test pass from earlier (Communications Hub, full upload → cross-check cycle, grid sort/filter/expand, reporting exports, session save/load, marketing nav) against a production build (`npm run build && npm run preview`), not just the dev server — dev and prod builds can behave differently (minification, `import.meta.env` substitution, etc.).
- [ ] Confirm the staging GitHub Action (`deploy-staging.yml`) has gone green at least once via manual `workflow_dispatch`, so the build/deploy mechanics are proven before trusting the same codebase against the client's pipeline.

## Lower priority — worth a decision, not necessarily a blocker

- [ ] `xlsx` package has a known high-severity advisory (pre-existing, unrelated to this migration) — decide whether to address before or after this merge.
- [ ] Decide whether `test-data/` and `file-templates/` should ship to `main` or stay dev-only (currently `file-templates/` is gitignored; `test-data/` is not).

## Rollback plan

If production breaks after merge: the client's Vercel dashboard keeps prior deployments — use "Promote to Production" on the last known-good deployment while a fix is worked out on `development`, rather than reverting the merge commit under pressure.
