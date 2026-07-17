import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAuthedUser } from "../_lib/auth";
import { stripe } from "../_lib/stripe";
import { getOrCreateStripeCustomer } from "../_lib/customer";

const PRICE_IDS: Record<string, string | undefined> = {
  monthly: process.env.STRIPE_PRICE_ID_MONTHLY,
  annual: process.env.STRIPE_PRICE_ID_ANNUAL,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const user = await getAuthedUser(req);
  if (!user) return res.status(401).json({ error: "Not authenticated" });

  const billing = req.body?.billing;
  const priceId = PRICE_IDS[billing];
  if (!priceId) return res.status(400).json({ error: "billing must be 'monthly' or 'annual'" });

  try {
    const stripeCustomerId = await getOrCreateStripeCustomer(user.id, user.email);
    const origin = (req.headers.origin as string | undefined) || `https://${req.headers.host}`;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/?checkout=success`,
      cancel_url: `${origin}/?checkout=cancelled`,
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error("checkout session error", err);
    return res.status(500).json({ error: "Could not start checkout" });
  }
}
