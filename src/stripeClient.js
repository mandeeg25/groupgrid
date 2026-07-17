import { getSupabase } from "./auth/supabaseClient";

async function callStripeApi(path, body) {
  const sb = getSupabase();
  const { data: { session } } = (await sb?.auth.getSession()) || { data: { session: null } };
  if (!session) throw new Error("Please sign in first.");

  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");
  return data;
}

// Starts a subscription checkout for the given billing option and redirects
// the browser to Stripe's hosted Checkout page.
export async function startCheckout(billing) {
  const { url } = await callStripeApi("/api/stripe/checkout", { billing });
  window.location.href = url;
}

// Opens Stripe's hosted Billing Portal (manage payment method, cancel, etc.)
// and redirects the browser there.
export async function openBillingPortal() {
  const { url } = await callStripeApi("/api/stripe/portal");
  window.location.href = url;
}
