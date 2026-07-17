import { eq } from "drizzle-orm";
import { db } from "../../db/client";
import { customers } from "../../db/schema";
import { stripe } from "./stripe";

// Looks up the Stripe customer for this Supabase user, creating both the
// Stripe Customer object and the local `customers` row on first use.
export async function getOrCreateStripeCustomer(userId: string, email: string): Promise<string> {
  const existing = await db.select().from(customers).where(eq(customers.id, userId)).limit(1);
  if (existing[0]) return existing[0].stripeCustomerId;

  const customer = await stripe.customers.create({ email, metadata: { supabaseUserId: userId } });
  await db.insert(customers).values({ id: userId, stripeCustomerId: customer.id });
  return customer.id;
}
