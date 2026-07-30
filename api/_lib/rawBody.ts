import type { VercelRequest } from "@vercel/node";

// Stripe signs the exact raw request bytes, so the webhook handler must read
// the stream itself rather than rely on any auto-parsed req.body.
export function getRawBody(req: VercelRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}
