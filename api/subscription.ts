import type { VercelRequest, VercelResponse } from "@vercel/node";
import { desc, eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { compedUsers, customers, subscriptions } from "../db/schema.js";
import { getAuthedUser } from "./_lib/auth.js";

// Statuses that count as "paying enough to use the app." past_due stays in
// here deliberately — Stripe auto-retries failed payments, so locking
// someone out on the first decline is harsher than necessary. Revisit if the
// client wants immediate lockout instead.
const ACCESS_STATUSES = new Set(["active", "trialing", "past_due"]);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const user = await getAuthedUser(req);
  if (!user) return res.status(401).json({ error: "Not authenticated" });

  // Manual override — bypasses Stripe entirely (e.g. the client's own account).
  const comped = await db.select().from(compedUsers).where(eq(compedUsers.id, user.id)).limit(1);
  if (comped[0]) return res.status(200).json({ hasAccess: true, status: "comped" });

  const customerRows = await db.select().from(customers).where(eq(customers.id, user.id)).limit(1);
  const customer = customerRows[0];
  if (!customer) return res.status(200).json({ hasAccess: false, status: null });

  const subRows = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.customerId, customer.id))
    .orderBy(desc(subscriptions.updatedAt))
    .limit(1);
  const subscription = subRows[0];
  if (!subscription) return res.status(200).json({ hasAccess: false, status: null });

  return res.status(200).json({ hasAccess: ACCESS_STATUSES.has(subscription.status), status: subscription.status });
}
