import crypto from "node:crypto";
import type { Session } from "@remix-run/node";

const CSRF_KEY = "csrfToken";

export function getOrCreateCsrfToken(session: Session): string {
  let token = session.get(CSRF_KEY) as string | undefined;
  if (!token) {
    token = crypto.randomBytes(24).toString("hex");
    session.set(CSRF_KEY, token);
  }
  return token;
}

export async function requireValidCsrf(formData: FormData, session: Session): Promise<void> {
  const submitted = formData.get("csrfToken");
  const token = session.get(CSRF_KEY);
  if (!submitted || typeof submitted !== "string" || !token || submitted !== token) {
    throw new Response("Invalid CSRF token", { status: 403 });
  }
}
