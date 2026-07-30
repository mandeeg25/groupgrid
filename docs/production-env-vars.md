# Production Environment Variables (Vercel)

The complete, current list of every environment variable the app reads — confirmed by grepping every `process.env.*` (server) and `import.meta.env.*` (client) reference in the codebase. Set all of these in the client's production Vercel project before the `main` deploy goes live (see `docs/merge-to-main-checklist.md`).

## Server-only (never `VITE_` prefixed)

Read only by `api/` and `db/` code — never bundled into the browser build.

| Var | Where to get it |
|---|---|
| `DATABASE_URL` | Supabase **production** project → Project Settings → Database → Connection string → pick the **Transaction** pooler mode (port 6543), not direct connection or session mode |
| `SUPABASE_JWKS_URL` | Production Supabase project's JWKS endpoint: `https://<project-ref>.supabase.co/auth/v1/.well-known/jwks.json` — the project ref is in Settings → API or the dashboard URL |
| `STRIPE_SECRET_KEY` | Stripe dashboard, toggled to **Live mode** → Developers → API keys → Secret key (`sk_live_...`) |
| `STRIPE_PRICE_ID_MONTHLY` | Stripe **live mode** → Product catalog → the live-mode monthly Price (must be recreated in live mode — test-mode price IDs don't exist there) → copy its Price ID (`price_...`) |
| `STRIPE_PRICE_ID_ANNUAL` | Same as above, for the annual Price |
| `STRIPE_WEBHOOK_SECRET` | Stripe **live mode** → Developers → Webhooks → add an endpoint at `https://<production-domain>/api/stripe/webhook`, subscribed to `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted` — after creating it, reveal the signing secret (`whsec_...`) |

## Client-side, `VITE_` prefixed

Bundled into the browser build at build time — set the same way in Vercel's env var UI, just with the `VITE_` prefix.

| Var | Where to get it |
|---|---|
| `VITE_SUPABASE_URL` | Production Supabase project → Settings → API → Project URL |
| `VITE_SUPABASE_KEY` | Same page → the **publishable/anon** key — never the `service_role`/secret key |

## Not needed

`.env.example` also lists `SUPABASE_SECRET_KEY`, but nothing in the current code reads it — it's reserved for a future case where a backend function needs to bypass RLS. Leave it unset in production unless/until something actually consumes it; setting it now is just a live credential sitting around unused.

Great work!
