import { json, redirect } from "@remix-run/node";
import { createUser, findUserByEmail, getOptionalUser, requireUser } from "~/lib/auth.server";
import { requireValidCsrf } from "~/lib/csrf.server";
import { addFaq, addLink, addShoppingItem, clearShoppingList, createChecklistTemplate, deleteChecklistTemplate, deleteFaq, deleteLink, listChecklistTemplates, listFaqEntries, listLinks, listShoppingItems, removeShoppingItem, reorderChecklistTemplates, reorderFaqEntries, reorderLinks, reorderShoppingItems, updateChecklistTemplate, updateFaq, updateLink } from "~/lib/data.server";
import { t } from "~/lib/i18n";
import { langFromRequest } from "~/lib/lang.server";
import { commitSession, getSession } from "~/lib/session.server";

export async function dashboardLoader(request: Request) {
  const user = await getOptionalUser(request);
  const lang = langFromRequest(request);
  const msg = t(lang);
  const url = new URL(request.url);
  const month = new Date().getMonth() + 1;
  const defaultSeason = month >= 10 || month <= 5 ? "winter" : "summer";
  const selectedSeason: "summer" | "winter" =
    url.searchParams.get("season") === "summer" || url.searchParams.get("season") === "winter"
      ? (url.searchParams.get("season") as "summer" | "winter")
      : defaultSeason;
  const editLinkRaw = url.searchParams.get("editLink");
  const editLinkParam = editLinkRaw ? Number(editLinkRaw) : NaN;
  const editingLinkId = Number.isFinite(editLinkParam) ? editLinkParam : null;
  const editTemplateRaw = url.searchParams.get("editTemplate");
  const editTemplateParam = editTemplateRaw ? Number(editTemplateRaw) : NaN;
  const editingTemplateId = Number.isFinite(editTemplateParam) ? editTemplateParam : null;
  const editFaqRaw = url.searchParams.get("editFaq");
  const editFaqParam = editFaqRaw ? Number(editFaqRaw) : NaN;
  const editingFaqId = Number.isFinite(editFaqParam) ? editFaqParam : null;
  const showUsersModal = url.searchParams.get("manageUsers") === "1";

  return json({
    checklist: listChecklistTemplates(),
    shoppingItems: listShoppingItems(),
    links: listLinks(lang),
    faqEntries: listFaqEntries(lang),
    selectedSeason,
    editingLinkId,
    editingTemplateId,
    editingFaqId,
    showUsersModal,
    canWrite: Boolean(user),
    msg,
    lang
  });
}

export async function dashboardAction(request: Request) {
  const user = await requireUser(request);
  const lang = langFromRequest(request);
  const session = await getSession(request.headers.get("Cookie"));
  const formData = await request.formData();

  await requireValidCsrf(formData, session);

  function parseIds(raw: FormDataEntryValue | null): number[] {
    if (!raw || typeof raw !== "string") return [];
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.map((id) => Number(id)).filter((id) => Number.isFinite(id));
    } catch {
      return [];
    }
  }

  const intent = String(formData.get("intent") || "");

  if (intent === "add-shopping") {
    const name = String(formData.get("name") || "").trim();
    if (name) addShoppingItem(name);
    const url = new URL(request.url);
    return redirect(`${url.pathname}${url.search}`, {
      headers: { "Set-Cookie": await commitSession(session) }
    });
  }

  if (intent === "remove-shopping") {
    const id = Number(formData.get("id"));
    if (Number.isFinite(id)) removeShoppingItem(id);
    const url = new URL(request.url);
    return redirect(`${url.pathname}${url.search}`, {
      headers: { "Set-Cookie": await commitSession(session) }
    });
  }

  if (intent === "clear-shopping") {
    clearShoppingList();
    const url = new URL(request.url);
    return redirect(`${url.pathname}${url.search}`, {
      headers: { "Set-Cookie": await commitSession(session) }
    });
  }

  if (intent === "add-template") {
    const title = String(formData.get("title") || "").trim();
    const seasonRaw = String(formData.get("season") || "");
    const season = seasonRaw === "winter" ? "winter" : "summer";
    if (title) createChecklistTemplate({ title, season });

    const url = new URL(request.url);
    return redirect(`${url.pathname}${url.search}`, {
      headers: { "Set-Cookie": await commitSession(session) }
    });
  }

  if (intent === "update-template") {
    const id = Number(formData.get("id"));
    const title = String(formData.get("title") || "").trim();
    const seasonRaw = String(formData.get("season") || "");
    const season = seasonRaw === "winter" ? "winter" : "summer";
    if (Number.isFinite(id) && title) {
      updateChecklistTemplate({ id, title, season });
    }

    const url = new URL(request.url);
    url.searchParams.delete("editTemplate");
    return redirect(`${url.pathname}${url.search}`, {
      headers: { "Set-Cookie": await commitSession(session) }
    });
  }

  if (intent === "delete-template") {
    const id = Number(formData.get("id"));
    if (Number.isFinite(id)) {
      deleteChecklistTemplate(id);
    }

    const url = new URL(request.url);
    url.searchParams.delete("editTemplate");
    return redirect(`${url.pathname}${url.search}`, {
      headers: { "Set-Cookie": await commitSession(session) }
    });
  }

  if (intent === "reorder-checklist") {
    const seasonRaw = String(formData.get("season") || "");
    const season = seasonRaw === "winter" ? "winter" : "summer";
    const ids = parseIds(formData.get("ids"));
    if (ids.length > 0) reorderChecklistTemplates(season, ids);
    return json({ ok: true }, { headers: { "Set-Cookie": await commitSession(session) } });
  }

  if (intent === "create-user") {
    const email = String(formData.get("email") || "").trim().toLowerCase();
    const password = String(formData.get("password") || "");
    if (email && password.length >= 4 && !findUserByEmail(email)) {
      await createUser(email, password, "admin");
    }
    const url = new URL(request.url);
    url.searchParams.delete("manageUsers");
    return redirect(`${url.pathname}${url.search}`, {
      headers: { "Set-Cookie": await commitSession(session) }
    });
  }

  if (intent === "reorder-shopping") {
    const ids = parseIds(formData.get("ids"));
    if (ids.length > 0) reorderShoppingItems(ids);
    return json({ ok: true }, { headers: { "Set-Cookie": await commitSession(session) } });
  }

  if (intent === "add-link") {
    const title_no = String(formData.get("title_no") || "").trim();
    const title_en = String(formData.get("title_en") || "").trim();
    const url = String(formData.get("url") || "").trim();
    if (title_no && title_en && url) addLink({ title_no, title_en, url });

    return redirect(`${new URL(request.url).pathname}${new URL(request.url).search}`, {
      headers: { "Set-Cookie": await commitSession(session) }
    });
  }

  if (intent === "update-link") {
    const id = Number(formData.get("id"));
    const title_no = String(formData.get("title_no") || "").trim();
    const title_en = String(formData.get("title_en") || "").trim();
    const linkUrl = String(formData.get("url") || "").trim();
    if (Number.isFinite(id) && title_no && title_en && linkUrl) {
      updateLink({ id, title_no, title_en, url: linkUrl });
    }

    const pageUrl = new URL(request.url);
    pageUrl.searchParams.delete("editLink");
    return redirect(`${pageUrl.pathname}${pageUrl.search}`, {
      headers: { "Set-Cookie": await commitSession(session) }
    });
  }

  if (intent === "delete-link") {
    const id = Number(formData.get("id"));
    if (Number.isFinite(id)) {
      deleteLink(id);
    }
    const pageUrl = new URL(request.url);
    pageUrl.searchParams.delete("editLink");
    return redirect(`${pageUrl.pathname}${pageUrl.search}`, {
      headers: { "Set-Cookie": await commitSession(session) }
    });
  }

  if (intent === "reorder-links") {
    const ids = parseIds(formData.get("ids"));
    if (ids.length > 0) reorderLinks(ids);
    return json({ ok: true }, { headers: { "Set-Cookie": await commitSession(session) } });
  }

  if (intent === "add-faq") {
    const questionNoRaw = String(formData.get("question_no") || "").trim();
    const questionEnRaw = String(formData.get("question_en") || "").trim();
    const answerNoRaw = String(formData.get("answer_no") || "").trim();
    const answerEnRaw = String(formData.get("answer_en") || "").trim();
    const question_no = questionNoRaw || questionEnRaw;
    const question_en = questionEnRaw || questionNoRaw;
    const answer_no = answerNoRaw || answerEnRaw;
    const answer_en = answerEnRaw || answerNoRaw;
    if (question_no && question_en && answer_no && answer_en) {
      addFaq({ question_no, question_en, answer_no, answer_en });
    }
    const url = new URL(request.url);
    return redirect(`${url.pathname}${url.search}`, {
      headers: { "Set-Cookie": await commitSession(session) }
    });
  }

  if (intent === "update-faq") {
    const id = Number(formData.get("id"));
    const question_no = String(formData.get("question_no") || "").trim();
    const question_en = String(formData.get("question_en") || "").trim();
    const answer_no = String(formData.get("answer_no") || "").trim();
    const answer_en = String(formData.get("answer_en") || "").trim();
    if (Number.isFinite(id) && question_no && question_en && answer_no && answer_en) {
      updateFaq({ id, question_no, question_en, answer_no, answer_en });
    }
    const url = new URL(request.url);
    url.searchParams.delete("editFaq");
    return redirect(`${url.pathname}${url.search}`, {
      headers: { "Set-Cookie": await commitSession(session) }
    });
  }

  if (intent === "delete-faq") {
    const id = Number(formData.get("id"));
    if (Number.isFinite(id)) {
      deleteFaq(id);
    }
    const url = new URL(request.url);
    url.searchParams.delete("editFaq");
    return redirect(`${url.pathname}${url.search}`, {
      headers: { "Set-Cookie": await commitSession(session) }
    });
  }

  if (intent === "reorder-faq") {
    const ids = parseIds(formData.get("ids"));
    if (ids.length > 0) reorderFaqEntries(ids);
    return json({ ok: true }, { headers: { "Set-Cookie": await commitSession(session) } });
  }

  return json({ ok: false, lang }, { status: 400, headers: { "Set-Cookie": await commitSession(session) } });
}
