import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is not set");

// No apiVersion pinned here — let the installed SDK use its own default so we
// don't have to keep a version string in sync by hand.
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
