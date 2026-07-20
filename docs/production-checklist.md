# Production Environment Checklist — Supabase & Stripe

Things to verify directly in the Supabase and Stripe dashboards before/at go-live. These are external configuration items that can't be checked from the codebase.

## Supabase (production project)

### Auth configuration
- [ ] **Site URL** is set to the production domain (not `localhost` or the staging URL)
- [ ] **Redirect URLs** allow-list contains only the production domain — remove any stray `localhost`/staging entries left over from development (a forgotten one is an open-redirect-adjacent risk on auth callbacks)
- [ ] **Confirm email** setting matches intended behavior — decide whether new signups get a session immediately or must verify first, and make sure the client knows which
- [ ] **Custom SMTP** is configured for auth emails. Supabase's built-in email service is rate-limited (a few emails/hour) — fine for testing, but confirmation/password-reset emails will silently stall in production without custom SMTP
- [ ] JWT / signing keys: confirm the production project has the **asymmetric signing keys** enabled (not just the legacy shared HS256 secret) — the server verifies tokens via `SUPABASE_JWKS_URL` against `.well-known/jwks.json`, which requires this
- [ ] Auth rate limits (sign-up, OTP, password reset) reviewed — defaults are conservative but worth confirming they fit expected signup volume

### Database
- [ ] Confirm RLS is actually enabled on `customers`, `subscriptions`, `webhook_events`, `comped_users` in the **live** project (migrations enable it, but worth a dashboard/SQL check that they actually ran against production and nothing was manually altered after)
- [ ] Spot-check: hit the PostgREST endpoint directly with the **anon key** for one of these tables and confirm it returns empty/forbidden, not data
- [ ] Confirm none of these 4 tables were added to the `supabase_realtime` publication (would broadcast row changes to subscribed clients)
- [ ] Point-in-time recovery / backups enabled for the production database
- [ ] Connection pooling: confirm `DATABASE_URL` in production points at the **pooler** (transaction mode), not a direct connection — serverless functions open a new connection per invocation and can exhaust the direct connection limit fast
- [ ] Postgres version is current / patched

### Keys & project hygiene
- [ ] Production Vercel env vars point at the **production** Supabase project (not staging/dev) — separate anon key, separate `SUPABASE_JWKS_URL`
- [ ] `SUPABASE_SECRET_KEY` isn't currently used anywhere in the server code (`api/`, `db/` — confirmed by grep) — if it's set in production env "just in case," that's an unused credential sitting live; either remove it or note explicitly why it's kept

## Stripe (production / live mode)

### Mode & keys
- [ ] `STRIPE_SECRET_KEY` in the production Vercel project is a **live** key (`sk_live_...`), not test
- [ ] Consider a **restricted key** scoped to only what the app uses (Customers, Checkout Sessions, Billing Portal Sessions, Subscriptions, Webhook Endpoints — read/write as needed) instead of the full account secret key
- [ ] `STRIPE_PRICE_ID_MONTHLY` / `STRIPE_PRICE_ID_ANNUAL` point at **live-mode** prices with the correct amount, currency, and billing interval — test-mode price IDs silently fail in live mode

### Webhook endpoint
- [ ] A **live-mode** webhook endpoint exists in the Stripe Dashboard pointing at the production URL (`https://<production-domain>/api/stripe/webhook`), separate from any test/staging endpoint
- [ ] It's subscribed to exactly the events the code handles: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted` — no gaps, no stale extras
- [ ] `STRIPE_WEBHOOK_SECRET` in production matches **this specific live endpoint's** signing secret (each endpoint gets its own `whsec_...`)

### Billing Portal
- [ ] Portal configuration (Dashboard → Billing → Customer portal) is set up for live mode specifically — cancellation policy (immediate vs. end-of-period), which fields customers can edit, business branding — matches what the client actually wants, not just Stripe's defaults

### Account readiness
- [ ] Business details, bank account/payout info, and tax details are complete for live mode (required before Stripe will settle real charges)
- [ ] Statement descriptor is set to something the client's customers will recognize (reduces "unrecognized charge" disputes)
- [ ] Radar (fraud rules) reviewed — defaults are reasonable, but worth a look if the client expects a specific customer geography
- [ ] Tax handling decided — Stripe Tax enabled, or the client has a manual process, for whatever jurisdictions apply

### Access control
- [ ] Who has dashboard access to the **live** Stripe account is deliberate (not everyone who has staging/test access) and 2FA is required on those accounts

### End-to-end sanity check
- [ ] Before calling this done, run one real low-amount live-mode subscription through the actual flow — checkout → webhook received → `customers`/`subscriptions` rows populated correctly in production → billing portal opens → cancel — then refund the charge. This is the only way to catch a live-mode misconfiguration (wrong price ID, wrong webhook secret, wrong portal settings) that would otherwise only surface when a real customer hits it.
