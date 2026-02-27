import argon2 from "argon2";
import { redirect } from "@remix-run/node";
import { db } from "~/lib/db.server";
import { commitSession, destroySession, getSession } from "~/lib/session.server";

export type Role = "admin" | "member";

export type User = {
  id: number;
  email: string;
  role: Role;
};

type UserRow = User & { password_hash: string };

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id });
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  return argon2.verify(hash, password);
}

export async function createUser(email: string, password: string, role: Role = "member"): Promise<void> {
  const passwordHash = await hashPassword(password);
  db.prepare(
    "INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)"
  ).run(email.toLowerCase().trim(), passwordHash, role);
}

export function findUserByEmail(email: string): UserRow | null {
  return (
    db
      .prepare("SELECT id, email, role, password_hash FROM users WHERE email = ?")
      .get(email.toLowerCase().trim()) ?? null
  ) as UserRow | null;
}

export function findUserById(id: number): User | null {
  return (db.prepare("SELECT id, email, role FROM users WHERE id = ?").get(id) ?? null) as User | null;
}

export function countUsers(): number {
  const row = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
  return row.count;
}

export async function verifyLogin(email: string, password: string): Promise<User | null> {
  const row = findUserByEmail(email);
  if (!row) return null;
  const ok = await verifyPassword(row.password_hash, password);
  if (!ok) return null;
  return { id: row.id, email: row.email, role: row.role };
}

export async function createUserSession(user: User, request: Request, to: string = "/"): Promise<Response> {
  const session = await getSession(request.headers.get("Cookie"));
  session.set("userId", user.id);
  return redirect(to, {
    headers: {
      "Set-Cookie": await commitSession(session)
    }
  });
}

export async function requireUser(request: Request): Promise<User> {
  const session = await getSession(request.headers.get("Cookie"));
  const userId = session.get("userId");
  if (typeof userId !== "number") {
    throw redirect("/login");
  }
  const user = findUserById(userId);
  if (!user) {
    throw redirect("/login", {
      headers: {
        "Set-Cookie": await destroySession(session)
      }
    });
  }
  return user;
}

export async function getOptionalUser(request: Request): Promise<User | null> {
  const session = await getSession(request.headers.get("Cookie"));
  const userId = session.get("userId");
  if (typeof userId !== "number") return null;
  return findUserById(userId);
}

export async function requireAdmin(request: Request): Promise<User> {
  const user = await requireUser(request);
  if (user.role !== "admin") {
    throw new Response("Forbidden", { status: 403 });
  }
  return user;
}

export async function logout(request: Request): Promise<Response> {
  const session = await getSession(request.headers.get("Cookie"));
  return redirect("/login", {
    headers: {
      "Set-Cookie": await destroySession(session)
    }
  });
}
