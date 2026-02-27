import crypto from "node:crypto";
import { db } from "~/lib/db.server";
import { env } from "~/lib/env.server";
import { findUserByEmail, hashPassword } from "~/lib/auth.server";
import { sendResetPasswordEmail } from "~/lib/mailer.server";

const TOKEN_TTL_MINUTES = 30;

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function expiresAtIso(minutesFromNow: number): string {
  return new Date(Date.now() + minutesFromNow * 60_000).toISOString();
}

export async function requestPasswordReset(email: string): Promise<void> {
  const user = findUserByEmail(email);
  if (!user) return;

  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = expiresAtIso(TOKEN_TTL_MINUTES);

  db.prepare(
    "INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)"
  ).run(user.id, tokenHash, expiresAt);

  const resetUrl = `${env.APP_URL}/reset-password?token=${token}`;
  await sendResetPasswordEmail({ to: user.email, resetUrl });
}

export async function resetPassword(token: string, nextPassword: string): Promise<boolean> {
  const tokenHash = hashToken(token);

  const row = db
    .prepare(
      `SELECT prt.id, prt.user_id, prt.expires_at, prt.used_at
       FROM password_reset_tokens prt
       WHERE prt.token_hash = ?
       ORDER BY prt.created_at DESC
       LIMIT 1`
    )
    .get(tokenHash) as { id: number; user_id: number; expires_at: string; used_at: string | null } | undefined;

  if (!row) return false;
  if (row.used_at) return false;
  if (new Date(row.expires_at).getTime() < Date.now()) return false;

  const passwordHash = await hashPassword(nextPassword);
  const now = new Date().toISOString();

  const tx = db.transaction(() => {
    db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(passwordHash, row.user_id);
    db.prepare("UPDATE password_reset_tokens SET used_at = ? WHERE id = ?").run(now, row.id);
  });

  tx();
  return true;
}
