import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAuthedUser } from "./_lib/auth.js";
import { getSubscriptionAccess } from "./_lib/subscriptionAccess.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const user = await getAuthedUser(req);
  if (!user) return res.status(401).json({ error: "Not authenticated" });

  const access = await getSubscriptionAccess(user.id);
  return res.status(200).json(access);
}
