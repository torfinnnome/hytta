function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  APP_URL: process.env.APP_URL ?? "http://localhost:3000",
  CABIN_LABEL: process.env.CABIN_LABEL ?? "Oversikt",
  SESSION_SECRET: process.env.SESSION_SECRET ?? "change-me-in-production",
  DB_PATH: process.env.DB_PATH ?? "./data/hytta.db",
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: Number(process.env.SMTP_PORT ?? 587),
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  SMTP_FROM: process.env.SMTP_FROM ?? "hytta@example.local",
  SMTP_SECURE: process.env.SMTP_SECURE === "true"
};

export function assertProductionEnv(): void {
  if (env.NODE_ENV === "production") {
    required("SESSION_SECRET");
  }
}
