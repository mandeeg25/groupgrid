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
// Supabase's `auth` schema — Drizzle doesn't migrate that schema, so this
// is a logical reference only.
export const customers = pgTable("customers", {
  id: uuid("id").primaryKey(),
  stripeCustomerId: text("stripe_customer_id").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}).enableRLS();

// Single subscription tier for now (matches the current $250/mo pricing page,
// one plan). Revisit if the client wants multiple tiers/seats later.
export const subscriptions = pgTable("subscriptions", {
  id: text("id").primaryKey(), // Stripe subscription id
  customerId: uuid("customer_id").notNull().references(() => customers.id),
  status: subscriptionStatus("status").notNull(),
  priceId: text("price_id").notNull(),
  currentPeriodEnd: timestamp("current_period_end").notNull(),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}).enableRLS();

// Idempotency log — Stripe can (and will) deliver the same webhook event
// more than once. Check for an existing id before processing.
export const webhookEvents = pgTable("webhook_events", {
  id: text("id").primaryKey(), // Stripe event id
  type: text("type").notNull(),
  payload: jsonb("payload"),
  processedAt: timestamp("processed_at").defaultNow().notNull(),
}).enableRLS();

// Manual access override — bypasses the Stripe subscription check entirely.
// Starting use case: the client's own account (her app, shouldn't need to pay
// herself), but kept generic for any other special-cased account later
// (support/QA, etc). Added via a one-off SQL insert, not through any UI.
export const compedUsers = pgTable("comped_users", {
  id: uuid("id").primaryKey(), // Supabase auth user id
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}).enableRLS();
