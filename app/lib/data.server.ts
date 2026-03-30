import { db } from "~/lib/db.server";
import type { Lang } from "~/lib/i18n";

export type ChecklistTemplate = {
  id: number;
  title: string;
  season: "summer" | "winter";
  sort_order: number;
};

export type ShoppingItem = {
  id: number;
  name: string;
  bought: number;
};

export type LinkItem = {
  id: number;
  title_no: string;
  title_en: string;
  title: string;
  url: string;
  icon: string;
  sort_order: number;
};

export type FaqItem = {
  id: number;
  question_no: string;
  question_en: string;
  answer_no: string;
  answer_en: string;
  question: string;
  answer: string;
  sort_order: number;
};

export type PhoneNumberItem = {
  id: number;
  title_no: string;
  title_en: string;
  title: string;
  phone_number: string;
  sort_order: number;
};

export function ensureBaseData(): void {
  const checklistCount = db.prepare("SELECT COUNT(*) as count FROM checklist_templates").get() as { count: number };
  if (checklistCount.count === 0) {
    const insert = db.prepare("INSERT INTO checklist_templates (title, season, sort_order) VALUES (?, ?, ?)");
    const tx = db.transaction(() => {
      insert.run("Luft ut alle rom", "summer", 1);
      insert.run("Sjekk vannpumpe", "summer", 2);
      insert.run("Sett på varmekabler", "winter", 1);
      insert.run("Fyll vedkurv", "winter", 2);
    });
    tx();
  }

  const linkCount = db.prepare("SELECT COUNT(*) as count FROM links").get() as { count: number };
  if (linkCount.count === 0) {
    const insert = db.prepare(
      "INSERT INTO links (title_no, title_en, url, icon, sort_order) VALUES (?, ?, ?, ?, ?)"
    );
    const tx = db.transaction(() => {
      insert.run("Yr Vær", "Yr Weather", "https://www.yr.no", "cloud", 1);
      insert.run("NVE Varsel", "NVE Alerts", "https://www.varsom.no", "triangle-alert", 2);
    });
    tx();
  }

  const faqCount = db.prepare("SELECT COUNT(*) as count FROM faq_entries").get() as { count: number };
  if (faqCount.count === 0) {
    const insert = db.prepare(
      "INSERT INTO faq_entries (question_no, question_en, answer_no, answer_en, sort_order) VALUES (?, ?, ?, ?, ?)"
    );
    const tx = db.transaction(() => {
      insert.run(
        "Hvor finner jeg husnokkelen?",
        "Where do I find the cabin key?",
        "Nokkelen ligger i nøkkelboksen ved inngangsdøren.",
        "The key is in the lockbox by the entrance door.",
        1
      );
      insert.run(
        "Hvordan slår jeg av vannet?",
        "How do I turn off the water?",
        "Hovedkranen står i boden ved varmtvannsberederen.",
        "The main valve is in the storage room near the water heater.",
        2
      );
    });
    tx();
  }

  const phoneCount = db.prepare("SELECT COUNT(*) as count FROM phone_numbers").get() as { count: number };
  if (phoneCount.count === 0) {
    const insert = db.prepare(
      "INSERT INTO phone_numbers (title_no, title_en, phone_number, sort_order) VALUES (?, ?, ?, ?)"
    );
    const tx = db.transaction(() => {
      insert.run("Politi: 112", "Police: 112", "112", 1);
      insert.run("Brann: 110", "Fire: 110", "110", 2);
      insert.run("Ambulanse: 113", "Ambulance: 113", "113", 3);
      insert.run("Legevakt: 116117", "Medical hotline: 116117", "116117", 4);
    });
    tx();
  }
}

ensureBaseData();

export function listChecklistTemplates(): ChecklistTemplate[] {
  return db
    .prepare("SELECT id, title, season, sort_order FROM checklist_templates ORDER BY season, sort_order, id")
    .all() as ChecklistTemplate[];
}

export function createChecklistTemplate(input: { title: string; season: "summer" | "winter" }): void {
  db.prepare("INSERT INTO checklist_templates (title, season, sort_order) VALUES (?, ?, ?)").run(
    input.title,
    input.season,
    Date.now()
  );
}

export function updateChecklistTemplate(input: { id: number; title: string; season: "summer" | "winter" }): void {
  db.prepare(
    "UPDATE checklist_templates SET title = ?, season = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
  ).run(input.title, input.season, input.id);
}

export function deleteChecklistTemplate(id: number): void {
  db.prepare("DELETE FROM checklist_templates WHERE id = ?").run(id);
}

export function reorderChecklistTemplates(season: "summer" | "winter", ids: number[]): void {
  const update = db.prepare("UPDATE checklist_templates SET sort_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND season = ?");
  const tx = db.transaction(() => {
    ids.forEach((id, index) => {
      update.run(index + 1, id, season);
    });
  });
  tx();
}

export function listShoppingItems(): ShoppingItem[] {
  return db
    .prepare("SELECT id, name, bought FROM shopping_list ORDER BY sort_order ASC, id DESC")
    .all() as ShoppingItem[];
}

export function addShoppingItem(name: string): ShoppingItem {
  const maxRow = db.prepare("SELECT COALESCE(MAX(sort_order), 0) as max_order FROM shopping_list").get() as { max_order: number };
  const result = db
    .prepare("INSERT INTO shopping_list (name, bought, sort_order) VALUES (?, 0, ?)")
    .run(name, maxRow.max_order + 1);
  return db.prepare("SELECT id, name, bought FROM shopping_list WHERE id = ?").get(result.lastInsertRowid) as ShoppingItem;
}

export function removeShoppingItem(id: number): void {
  db.prepare("DELETE FROM shopping_list WHERE id = ?").run(id);
}

export function clearShoppingList(): void {
  db.prepare("DELETE FROM shopping_list").run();
}

export function reorderShoppingItems(ids: number[]): void {
  const update = db.prepare("UPDATE shopping_list SET sort_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?");
  const tx = db.transaction(() => {
    ids.forEach((id, index) => {
      update.run(index + 1, id);
    });
  });
  tx();
}

export function listLinks(lang: Lang): LinkItem[] {
  const rows = db
    .prepare("SELECT id, title_no, title_en, url, icon, sort_order FROM links ORDER BY sort_order, id")
    .all() as Array<{ id: number; title_no: string; title_en: string; url: string; icon: string; sort_order: number }>;

  return rows.map((row) => ({
    id: row.id,
    title_no: row.title_no,
    title_en: row.title_en,
    title: lang === "en" ? row.title_en : row.title_no,
    url: row.url,
    icon: row.icon,
    sort_order: row.sort_order
  }));
}

export function addLink(input: { title_no: string; title_en: string; url: string; icon?: string }): void {
  db.prepare("INSERT INTO links (title_no, title_en, url, icon, sort_order) VALUES (?, ?, ?, ?, ?)").run(
    input.title_no,
    input.title_en,
    input.url,
    input.icon ?? "link",
    Date.now()
  );
}

export function updateLink(input: { id: number; title_no: string; title_en: string; url: string; icon?: string }): void {
  db.prepare(
    "UPDATE links SET title_no = ?, title_en = ?, url = ?, icon = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
  ).run(input.title_no, input.title_en, input.url, input.icon ?? "link", input.id);
}

export function deleteLink(id: number): void {
  db.prepare("DELETE FROM links WHERE id = ?").run(id);
}

export function reorderLinks(ids: number[]): void {
  const update = db.prepare("UPDATE links SET sort_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?");
  const tx = db.transaction(() => {
    ids.forEach((id, index) => {
      update.run(index + 1, id);
    });
  });
  tx();
}

export function listFaqEntries(lang: Lang): FaqItem[] {
  const rows = db
    .prepare(
      "SELECT id, question_no, question_en, answer_no, answer_en, sort_order FROM faq_entries ORDER BY sort_order, id"
    )
    .all() as Array<{
    id: number;
    question_no: string;
    question_en: string;
    answer_no: string;
    answer_en: string;
    sort_order: number;
  }>;

  return rows.map((row) => ({
    id: row.id,
    question_no: row.question_no,
    question_en: row.question_en,
    answer_no: row.answer_no,
    answer_en: row.answer_en,
    question: lang === "en" ? row.question_en : row.question_no,
    answer: lang === "en" ? row.answer_en : row.answer_no,
    sort_order: row.sort_order
  }));
}

export function addFaq(input: {
  question_no: string;
  question_en: string;
  answer_no: string;
  answer_en: string;
}): void {
  const maxRow = db.prepare("SELECT COALESCE(MAX(sort_order), 0) as max_order FROM faq_entries").get() as {
    max_order: number;
  };
  db.prepare(
    "INSERT INTO faq_entries (question_no, question_en, answer_no, answer_en, sort_order) VALUES (?, ?, ?, ?, ?)"
  ).run(input.question_no, input.question_en, input.answer_no, input.answer_en, maxRow.max_order + 1);
}

export function updateFaq(input: {
  id: number;
  question_no: string;
  question_en: string;
  answer_no: string;
  answer_en: string;
}): void {
  db.prepare(
    "UPDATE faq_entries SET question_no = ?, question_en = ?, answer_no = ?, answer_en = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
  ).run(input.question_no, input.question_en, input.answer_no, input.answer_en, input.id);
}

export function deleteFaq(id: number): void {
  db.prepare("DELETE FROM faq_entries WHERE id = ?").run(id);
}

export function reorderFaqEntries(ids: number[]): void {
  const update = db.prepare("UPDATE faq_entries SET sort_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?");
  const tx = db.transaction(() => {
    ids.forEach((id, index) => {
      update.run(index + 1, id);
    });
  });
  tx();
}

export function listPhoneNumbers(lang: Lang): PhoneNumberItem[] {
  const rows = db
    .prepare("SELECT id, title_no, title_en, phone_number, sort_order FROM phone_numbers ORDER BY sort_order, id")
    .all() as Array<{ id: number; title_no: string; title_en: string; phone_number: string; sort_order: number }>;

  return rows.map((row) => ({
    id: row.id,
    title_no: row.title_no,
    title_en: row.title_en,
    title: lang === "en" ? row.title_en : row.title_no,
    phone_number: row.phone_number,
    sort_order: row.sort_order
  }));
}

export function addPhoneNumber(input: { title_no: string; title_en: string; phone_number: string }): void {
  db.prepare(
    "INSERT INTO phone_numbers (title_no, title_en, phone_number, sort_order) VALUES (?, ?, ?, ?)"
  ).run(input.title_no, input.title_en, input.phone_number, Date.now());
}

export function updatePhoneNumber(input: { id: number; title_no: string; title_en: string; phone_number: string }): void {
  db.prepare(
    "UPDATE phone_numbers SET title_no = ?, title_en = ?, phone_number = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
  ).run(input.title_no, input.title_en, input.phone_number, input.id);
}

export function deletePhoneNumber(id: number): void {
  db.prepare("DELETE FROM phone_numbers WHERE id = ?").run(id);
}

export function reorderPhoneNumbers(ids: number[]): void {
  const update = db.prepare("UPDATE phone_numbers SET sort_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?");
  const tx = db.transaction(() => {
    ids.forEach((id, index) => {
      update.run(index + 1, id);
    });
  });
  tx();
}
