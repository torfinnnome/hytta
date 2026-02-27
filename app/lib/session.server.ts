import { createCookieSessionStorage } from "@remix-run/node";
import { env } from "~/lib/env.server";

export const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "__hytta_session",
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secrets: [env.SESSION_SECRET],
    secure: env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30
  }
});

export const { getSession, commitSession, destroySession } = sessionStorage;
