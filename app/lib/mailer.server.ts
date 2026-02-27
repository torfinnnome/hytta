import nodemailer from "nodemailer";
import { env } from "~/lib/env.server";

function createTransport() {
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) return null;
  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS
    }
  });
}

export async function sendResetPasswordEmail(params: { to: string; resetUrl: string }): Promise<void> {
  const transporter = createTransport();
  if (!transporter) {
    console.warn("SMTP is not configured; reset email skipped", { to: params.to, resetUrl: params.resetUrl });
    return;
  }

  await transporter.sendMail({
    from: env.SMTP_FROM,
    to: params.to,
    subject: "Hytta: Reset password",
    text: `Reset your password: ${params.resetUrl}`,
    html: `<p>Reset your password:</p><p><a href=\"${params.resetUrl}\">${params.resetUrl}</a></p>`
  });
}
