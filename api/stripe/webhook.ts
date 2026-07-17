import type { VercelRequest, VercelResponse } from "@vercel/node";
import type Stripe from "stripe";
import { stripe } from "../_lib/stripe";
import { getRawBody } from "../_lib/rawBody";
import { syncSubscriptionFromStripe } from "../_lib/subscriptions";
import { db } from "../../db/client";
import { webhookEvents } from "../../db/schema";

// Disables Vercel's automatic JSON body parsing — Stripe signs the exact raw
// bytes, so constructEvent() needs the untouched body, not a re-parsed object.
export const config = { api: { bodyParser: false } };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const signature = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || typeof signature !== "string" || !webhookSecret) {
    return res.status(500).json({ error: "Webhook not configured" });
  }

  const rawBody = await getRawBody(req);

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed", err);
    return res.status(400).send(`Webhook Error: ${(err as Error).message}`);
  }

  // Idempotency — Stripe redelivers events, sometimes more than once. Insert
  // first; if this event id already exists, skip reprocessing it.
  const inserted = await db
    .insert(webhookEvents)
    .values({ id: event.id, type: event.type, payload: event as unknown as object })
    .onConflictDoNothing({ target: webhookEvents.id })
    .returning();
  if (inserted.length === 0) {
    return res.status(200).json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await syncSubscriptionFromStripe(event.data.object as Stripe.Subscription);
        break;

      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === "subscription" && session.subscription) {
          const subId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
          const sub = await stripe.subscriptions.retrieve(subId);
          await syncSubscriptionFromStripe(sub);
        }
        break;
      }

      default:
        break; // no local state depends on other event types yet
    }
  } catch (err) {
    console.error(`Error processing webhook event ${event.id} (${event.type})`, err);
    return res.status(500).json({ error: "Webhook handler failed" });
  }

  return res.status(200).json({ received: true });
}
