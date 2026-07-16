# Stripe Integration — Backend & Schema Plan

## Why a backend is required

Stripe's security model splits responsibilities:

- **Client-side** (Stripe.js / Checkout redirect): collects payment details, never touches your server with raw card data.
- **Server-side (required)**: creating Checkout/Billing Portal sessions, and — critically — **verifying webhook signatures** with the Stripe secret key. That key must never ship in the browser bundle, unlike the Supabase publishable key currently hardcoded in `src/GroupGrid.jsx`.

Webhooks are the forcing function for a real database. Stripe calls your server directly when a subscription renews, a payment fails, or a card is disputed — there's no browser session in the loop at that moment, so `localStorage` can't hold this state. Subscription status has to live somewhere the server can read it on every access check.

GroupGrid today has no backend and no database beyond Supabase Auth (see main summary). This doc sketches the minimum needed to add both for Stripe.

## Proposed schema (Drizzle / Postgres via Supabase)

Stripe remains the source of truth for billing; these tables are a local mirror kept in sync via webhooks, which is the pattern Stripe's own docs recommend (avoid re-deriving billing state from the frontend).

```ts
import { pgTable, uuid, text, timestamp, boolean, jsonb, pgEnum } from "drizzle-orm/pg-core";

export const subscriptionStatus = pgEnum("subscription_status", [
  "trialing",
  "active",
  "past_due",
  "canceled",
  "unpaid",
  "incomplete",
  "incomplete_expired",
  "paused",
]);

// One row per app user that has ever started checkout.
// id = Supabase auth user id (uuid). Not a Drizzle-managed FK into
// Supabase's `auth` schema — Drizzle shouldn't try to migrate that schema,
// so treat this as a logical reference only.
export const customers = pgTable("customers", {
  id: uuid("id").primaryKey(),
  stripeCustomerId: text("stripe_customer_id").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const subscriptions = pgTable("subscriptions", {
  id: text("id").primaryKey(), // Stripe subscription id
  customerId: uuid("customer_id").notNull().references(() => customers.id),
  status: subscriptionStatus("status").notNull(),
  priceId: text("price_id").notNull(),
  currentPeriodEnd: timestamp("current_period_end").notNull(),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Idempotency log — Stripe can (and will) deliver the same webhook
// event more than once. Check for existing id before processing.
export const webhookEvents = pgTable("webhook_events", {
  id: text("id").primaryKey(), // Stripe event id
  type: text("type").notNull(),
  payload: jsonb("payload"),
  processedAt: timestamp("processed_at").defaultNow().notNull(),
});
```

Not included yet, add only if a need shows up: an `invoices`/`payment_history` table (skip this initially — Stripe's Customer Portal already shows billing history, so don't build your own until there's a reason to).

## API surface needed

| Endpoint | Auth | Purpose |
|---|---|---|
| `POST /api/stripe/checkout` | Supabase-authenticated | Look up or create Stripe customer, create a Checkout Session for the chosen price, return `{ url }` to redirect to. |
| `POST /api/stripe/portal` | Supabase-authenticated | Create a Billing Portal session so users can update card/cancel/change plan without you building that UI. |
| `POST /api/stripe/webhook` | Stripe signature, not user auth | Handle `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`; upsert into `subscriptions`, log into `webhook_events`. |
| `GET /api/subscription` | Supabase-authenticated | Return the caller's current plan/status, for gating the product UI. |

Auth on the non-webhook routes: validate the Supabase access token passed as `Authorization: Bearer <token>` from the frontend (e.g. `supabase.auth.getUser(token)` server-side) — there's no session cookie today since auth is entirely client-driven.

## Serverless functions vs. a separate backend deployment

**Recommendation: Vercel serverless functions in the same project (`/api` routes), not a separate Express deployment.**

Reasoning, given the limits you noted (4.5 MB request/response):

- **The payload limit is a non-issue for Stripe specifically.** Checkout/portal session requests and responses are small JSON objects (well under 1 KB typically). Stripe webhook payloads are also small — even a `subscription.updated` event with expanded objects is generally tens of KB, far from 4.5 MB. The limit only bites if you route large file uploads (e.g. vendor spreadsheets) through the same API layer — that's not part of the Stripe work, and today spreadsheet parsing happens entirely client-side via `xlsx` anyway.
- **Operational simplicity.** One deploy, one project, no CORS setup between a frontend origin and a separate API origin, one place for env vars (`STRIPE_SECRET_KEY`, webhook signing secret, Supabase service role key). This matches the `vercel.json` SPA setup already in the repo.
- **A "separate Vercel project running Express" isn't really a thing** — Vercel doesn't host long-running processes; an Express app deployed there gets wrapped into serverless functions anyway (e.g. via `serverless-http`), so you'd get the same execution model with more config, not less. A genuinely separate Express backend would mean a different host entirely (Railway, Render, Fly, a VM) — extra infra to provision, monitor, and secure for no benefit at this scope.

**When a separate backend would start to make sense** (not needed for Stripe alone, worth flagging for later): long-running jobs, websockets/real-time, or moving the spreadsheet cross-match engine server-side for very large guest lists — things that don't fit within a serverless function's execution time limits. Check Vercel's current function duration/memory limits before relying on specific numbers, since they vary by plan and change over time.

**One real gotcha to plan for:** serverless functions open and tear down DB connections per invocation, which can exhaust Postgres's connection limit under load. Use Supabase's connection pooler (the pgbouncer endpoint, port 6543) as the connection string Drizzle points at from these functions, rather than the direct Postgres connection.

## Note: spreadsheet file size vs. the Vercel payload limit

Not a concern today — confirmed in `src/GroupGrid.jsx` (~line 4998-5001) that uploaded vendor spreadsheets never leave the browser. `input[type=file]` → `FileReader.readAsArrayBuffer` → `XLSX.read` all happen client-side; the only `fetch` calls in the app are small JSON posts to HubSpot. No file ever crosses the 4.5 MB Vercel limit because no file crosses the network at all.

This becomes relevant once the "sync sessions to Supabase DB" TODO is acted on, *if* that sync is implemented by routing data through a Vercel serverless function:

- **Parsed, structured guest-record JSON** — low risk. Parsing strips formatting/styling, so this is far smaller than the source file.
- **Raw `.xlsx` files** — higher risk. Real-world vendor exports (rooming lists, flight manifests) with formatting/merged cells/multiple sheets can run 5-15+ MB for large events, which could exceed the limit.

**Recommendation:** keep parsing client-side as it already is, and sync only the parsed JSON through the API — never raw file bytes. If raw files ever need to be persisted (e.g. audit trail), upload them directly to object storage (Supabase Storage / S3) via a signed URL issued by an API route, so bytes flow browser → storage directly and bypass the serverless function body entirely.

## Open questions to confirm with the client

- Single subscription tier, or multiple plans/seats? Affects whether `priceId` alone is enough or a `products`/`plans` table is warranted.
- Does the product need in-app billing history, or is Stripe's Customer Portal sufficient?
- Any grandfathered/free-tier users to account for in the access-gating logic?
