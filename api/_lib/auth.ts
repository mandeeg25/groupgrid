import type { VercelRequest } from "@vercel/node";
import { createRemoteJWKSet, jwtVerify } from "jose";

// Verifies Supabase-issued JWTs locally against the project's public signing
// keys (asymmetric — no shared secret needed server-side). The issuer is
// derived from SUPABASE_JWKS_URL so we don't need a second, duplicate env var.
const jwksUrl = process.env.SUPABASE_JWKS_URL;
if (!jwksUrl) throw new Error("SUPABASE_JWKS_URL is not set");

const JWKS = createRemoteJWKSet(new URL(jwksUrl));
const issuer = jwksUrl.replace(/\/\.well-known\/jwks\.json$/, "");

export type AuthedUser = { id: string; email: string };

export async function getAuthedUser(req: VercelRequest): Promise<AuthedUser | null> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length);

  try {
    const { payload } = await jwtVerify(token, JWKS, { issuer, audience: "authenticated" });
    if (!payload.sub || typeof payload.email !== "string") return null;
    return { id: payload.sub, email: payload.email };
  } catch {
    return null; // expired, malformed, or wrong signature — treat all as unauthenticated
  }
}
