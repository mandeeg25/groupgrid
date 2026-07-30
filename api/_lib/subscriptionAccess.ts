import { desc, eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { compedUsers, customers, subscriptions } from "../../db/schema.js";

// Statuses that count as "paying enough to use the app." past_due stays in
// here deliberately — Stripe auto-retries failed payments, so locking
// someone out on the first decline is harsher than necessary. Revisit if the
// client wants immediate lockout instead.
export const ACCESS_STATUSES = new Set(["active", "trialing", "past_due"]);

export type SubscriptionAccess = { hasAccess: boolean; status: string | null };

// Shared by /api/subscription (the UI gate) and /api/stripe/checkout (to stop
// an already-subscribed user from starting a second, duplicate subscription).
export async function getSubscriptionAccess(userId: string): Promise<SubscriptionAccess> {
  const comped = await db.select().from(compedUsers).where(eq(compedUsers.id, userId)).limit(1);
  if (comped[0]) return { hasAccess: true, status: "comped" };

  const customerRows = await db.select().from(customers).where(eq(customers.id, userId)).limit(1);
  const customer = customerRows[0];
  if (!customer) return { hasAccess: false, status: null };

  const subRows = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.customerId, customer.id))
    .orderBy(desc(subscriptions.updatedAt))
    .limit(1);
  const subscription = subRows[0];
  if (!subscription) return { hasAccess: false, status: null };

  return { hasAccess: ACCESS_STATUSES.has(subscription.status), status: subscription.status };
}
