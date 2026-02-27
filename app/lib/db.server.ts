import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { env } from "~/lib/env.server";

const dbDir = path.dirname(env.DB_PATH);
fs.mkdirSync(dbDir, { recursive: true });

export const db = new Database(env.DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

function hasColumn(table: string, column: string): boolean {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  return rows.some((row) => row.name === column);
}

function ensureShoppingSortOrder(): void {
  if (!hasColumn("shopping_list", "sort_order")) {
    db.exec("ALTER TABLE shopping_list ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;");
  }

  const countWithOrder = db
    .prepare("SELECT COUNT(*) as count FROM shopping_list WHERE sort_order > 0")
    .get() as { count: number };
  if (countWithOrder.count === 0) {
    const rows = db.prepare("SELECT id FROM shopping_list ORDER BY id DESC").all() as Array<{ id: number }>;
    const update = db.prepare("UPDATE shopping_list SET sort_order = ? WHERE id = ?");
    const tx = db.transaction(() => {
      rows.forEach((row, index) => {
        update.run(index + 1, row.id);
      });
    });
    tx();
  }
}

export function initDb(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin', 'member')) DEFAULT 'member',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
    CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token_hash ON password_reset_tokens(token_hash);

    CREATE TABLE IF NOT EXISTS checklist_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      season TEXT NOT NULL CHECK (season IN ('summer', 'winter')),
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS shopping_list (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      bought INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title_no TEXT NOT NULL,
      title_en TEXT NOT NULL,
      url TEXT NOT NULL,
      icon TEXT NOT NULL DEFAULT 'link',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS faq_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question_no TEXT NOT NULL,
      question_en TEXT NOT NULL,
      answer_no TEXT NOT NULL,
      answer_en TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  ensureShoppingSortOrder();
}

initDb();
