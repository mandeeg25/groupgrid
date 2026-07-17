import type { VercelRequest, VercelResponse } from "@vercel/node";
import { eq } from "drizzle-orm";
import { db } from "../../db/client";
import { customers } from "../../db/schema";
import { getAuthedUser } from "../_lib/auth";
import { stripe } from "../_lib/stripe";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const user = await getAuthedUser(req);
  if (!user) return res.status(401).json({ error: "Not authenticated" });

  const rows = await db.select().from(customers).where(eq(customers.id, user.id)).limit(1);
  const customer = rows[0];
  if (!customer) return res.status(400).json({ error: "No billing account yet — start a checkout first" });

  try {
    const origin = (req.headers.origin as string | undefined) || `https://${req.headers.host}`;
    const session = await stripe.billingPortal.sessions.create({
      customer: customer.stripeCustomerId,
      return_url: origin,
    });
    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error("portal session error", err);
    return res.status(500).json({ error: "Could not open billing portal" });
  }
}
