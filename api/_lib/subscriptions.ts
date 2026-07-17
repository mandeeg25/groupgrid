import type Stripe from "stripe";
import { eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { customers, subscriptions } from "../../db/schema.js";

// Upserts our local `subscriptions` row to match Stripe's current state,
// called whenever a webhook tells us something changed (created, updated,
// canceled). Stripe is the source of truth; this table is just a local mirror.
export async function syncSubscriptionFromStripe(sub: Stripe.Subscription) {
  const stripeCustomerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;

  const customerRows = await db.select().from(customers).where(eq(customers.stripeCustomerId, stripeCustomerId)).limit(1);
  const customer = customerRows[0];
  if (!customer) {
    // Shouldn't happen in practice — checkout.ts always creates the customers row
    // before the Checkout Session exists — but if it does, throw so Stripe retries
    // the webhook rather than silently dropping a subscription update.
    throw new Error(`No local customer for Stripe customer ${stripeCustomerId} — cannot sync subscription ${sub.id}`);
  }

  // Single price per subscription in our flow (one line item at checkout),
  // so items.data[0] is always the one that matters.
  const item = sub.items.data[0];
  if (!item) throw new Error(`Subscription ${sub.id} has no items — nothing to sync`);

  const values = {
    status: sub.status,
    priceId: item.price.id,
    currentPeriodEnd: new Date(item.current_period_end * 1000),
    cancelAtPeriodEnd: sub.cancel_at_period_end,
    updatedAt: new Date(),
  };

  await db
    .insert(subscriptions)
    .values({ id: sub.id, customerId: customer.id, ...values })
    .onConflictDoUpdate({ target: subscriptions.id, set: values });
}
