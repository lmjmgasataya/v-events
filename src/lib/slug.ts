import { randomBytes } from "node:crypto";

/** Short unguessable token for an event's public link, e.g. "k3Vq9xZt2a". */
export function generatePublicSlug(): string {
  return randomBytes(8).toString("base64url").slice(0, 10);
}
