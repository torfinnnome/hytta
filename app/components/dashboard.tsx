import { Form, useFetcher, useNavigate, useNavigation } from "@remix-run/react";
import { Cloud, Link as LinkIcon, TriangleAlert } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Lang } from "~/lib/i18n";

type Msg = {
  checklists: string;
  season: string;
  summer: string;
  winter: string;
  resetList: string;
  shoppingList: string;
  addItem: string;
  clearAll: string;
  markBought: string;
  externalLinks: string;
  editLink: string;
  addLink: string;
  delete: string;
  usefulNumbers: string;
  addPhone: string;
  faq: string;
  searchFaq: string;
  addFaq: string;
  question: string;
  answer: string;
  noFaqMatches: string;
  cancel: string;
  createUser: string;
  users: string;
  readOnlyMode: string;
  save: string;
};

type ChecklistTemplate = {
  id: number;
  title: string;
  season: "summer" | "winter";
};

type ShoppingItem = {
  id: number;
  name: string;
  bought: number;
};

type LinkItem = {
  id: number;
  title_no: string;
  title_en: string;
  title: string;
  url: string;
  icon: string;
};

type PhoneNumberItem = {
  id: number;
  title_no: string;
  title_en: string;
  title: string;
  phone_number: string;
};

type FaqItem = {
  id: number;
  question_no: string;
  question_en: string;
  answer_no: string;
  answer_en: string;
  question: string;
  answer: string;
};

type Props = {
  lang: Lang;
  msg: Msg;
  csrfToken: string;
  canWrite: boolean;
  selectedSeason: "summer" | "winter";
  editingFaqId: number | null;
  editingLinkId: number | null;
  editingTemplateId: number | null;
  editingPhoneNumberId: number | null;
  showUsersModal: boolean;
  checklist: ChecklistTemplate[];
  faqEntries: FaqItem[];
  shoppingItems: ShoppingItem[];
  links: LinkItem[];
  phoneNumbers: PhoneNumberItem[];
};

function linkIcon(name: string) {
  if (name === "cloud") return Cloud;
  if (name === "triangle-alert") return TriangleAlert;
  return LinkIcon;
}

export function Dashboard(props: Props) {
  const actionPath = props.lang === "en" ? "/en" : "/";
  const pageAction =
    props.lang === "en"
      ? `/en?season=${props.selectedSeason}`
      : `/?index&season=${props.selectedSeason}`;
  const navigate = useNavigate();
  const usersModalHref = `${pageAction}&manageUsers=1`;
  const [faqSearch, setFaqSearch] = useState("");
  const checklistBySeason = useMemo(
    () => ({
      summer: props.checklist.filter((item) => item.season === "summer"),
      winter: props.checklist.filter((item) => item.season === "winter")
    }),
    [props.checklist]
  );
  const selectedChecklist = checklistBySeason[props.selectedSeason];

  const tickStorageKey = `hytta:ticks:${props.lang}:${props.selectedSeason}`;
  const [ticks, setTicks] = useState<Record<number, boolean>>({});
  const [tickReloadNonce, setTickReloadNonce] = useState(0);
  const addFetcher = useFetcher();
  const navigation = useNavigation();
  const reorderFetcher = useFetcher();
  const addTemplateFormRef = useRef<HTMLFormElement>(null);
  const addShoppingFormRef = useRef<HTMLFormElement>(null);
  const addLinkFormRef = useRef<HTMLFormElement>(null);
  const addPhoneFormRef = useRef<HTMLFormElement>(null);
  const addFaqFormRef = useRef<HTMLFormElement>(null);
  const [pendingResetTemplate, setPendingResetTemplate] = useState(false);
  const [pendingResetShopping, setPendingResetShopping] = useState(false);
  const [pendingResetLink, setPendingResetLink] = useState(false);
  const [pendingResetPhone, setPendingResetPhone] = useState(false);
  const [pendingResetFaq, setPendingResetFaq] = useState(false);
  const [dragChecklistId, setDragChecklistId] = useState<number | null>(null);
  const [dragShoppingId, setDragShoppingId] = useState<number | null>(null);
  const [dragLinkId, setDragLinkId] = useState<number | null>(null);
  const [dragPhoneId, setDragPhoneId] = useState<number | null>(null);
  const [dragFaqId, setDragFaqId] = useState<number | null>(null);
  const [localChecklist, setLocalChecklist] = useState<ChecklistTemplate[]>(selectedChecklist);
  const [localLinks, setLocalLinks] = useState<LinkItem[]>(props.links);
  const [localPhoneNumbers, setLocalPhoneNumbers] = useState<PhoneNumberItem[]>(props.phoneNumbers);
  const [localFaq, setLocalFaq] = useState<FaqItem[]>(props.faqEntries);

  useEffect(() => {
    const raw = window.localStorage.getItem(tickStorageKey);
    if (raw) {
      try {
        setTicks(JSON.parse(raw));
      } catch {
        setTicks({});
      }
    } else {
      setTicks({});
    }
  }, [tickStorageKey, tickReloadNonce]);

  useEffect(() => {
    window.localStorage.setItem(tickStorageKey, JSON.stringify(ticks));
  }, [ticks, tickStorageKey]);

  const [optimisticItems, setOptimisticItems] = useState<ShoppingItem[]>(props.shoppingItems);
  const editingLink = props.links.find((item) => item.id === props.editingLinkId) ?? null;
  const editingPhoneNumber = props.phoneNumbers.find((item) => item.id === props.editingPhoneNumberId) ?? null;
  const editingTemplate = props.checklist.find((item) => item.id === props.editingTemplateId) ?? null;
  const editingFaq = props.faqEntries.find((item) => item.id === props.editingFaqId) ?? null;
  const pendingAddName = addFetcher.formData?.get("name");
  const mergedItems =
    addFetcher.state !== "idle" && typeof pendingAddName === "string" && pendingAddName.trim()
      ? [{ id: -1, name: pendingAddName.trim(), bought: 0 }, ...optimisticItems]
      : optimisticItems;
  const filteredFaq = localFaq.filter((item) => {
    const haystack = `${item.question} ${item.answer}`.toLowerCase();
    return haystack.includes(faqSearch.toLowerCase());
  });

  useEffect(() => {
    setOptimisticItems(props.shoppingItems);
  }, [props.shoppingItems]);
  useEffect(() => {
    setLocalChecklist(selectedChecklist);
  }, [selectedChecklist]);
  useEffect(() => {
    setLocalLinks(props.links);
  }, [props.links]);
  useEffect(() => {
    setLocalPhoneNumbers(props.phoneNumbers);
  }, [props.phoneNumbers]);
  useEffect(() => {
    setLocalFaq(props.faqEntries);
  }, [props.faqEntries]);
  useEffect(() => {
    if (pendingResetTemplate && navigation.state === "idle") {
      addTemplateFormRef.current?.reset();
      setPendingResetTemplate(false);
    }
  }, [pendingResetTemplate, navigation.state]);
  useEffect(() => {
    if (pendingResetShopping && addFetcher.state === "idle") {
      addShoppingFormRef.current?.reset();
      setPendingResetShopping(false);
    }
  }, [pendingResetShopping, addFetcher.state]);
  useEffect(() => {
    if (pendingResetLink && navigation.state === "idle") {
      addLinkFormRef.current?.reset();
      setPendingResetLink(false);
    }
  }, [pendingResetLink, navigation.state]);
  useEffect(() => {
    if (pendingResetPhone && navigation.state === "idle") {
      addPhoneFormRef.current?.reset();
      setPendingResetPhone(false);
    }
  }, [pendingResetPhone, navigation.state]);
  useEffect(() => {
    if (pendingResetFaq && navigation.state === "idle") {
      addFaqFormRef.current?.reset();
      setPendingResetFaq(false);
    }
  }, [pendingResetFaq, navigation.state]);

  useEffect(() => {
    if (!props.showUsersModal) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        navigate(pageAction);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [props.showUsersModal, navigate, pageAction]);

  function toggleTick(id: number) {
    setTicks((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function clearTicks() {
    window.localStorage.removeItem(`hytta:ticks:${props.lang}:summer`);
    window.localStorage.removeItem(`hytta:ticks:${props.lang}:winter`);
    setTicks({});
    setTickReloadNonce((prev) => prev + 1);
  }

  function reorderById<T extends { id: number }>(list: T[], draggedId: number, targetId: number): T[] {
    const from = list.findIndex((item) => item.id === draggedId);
    const to = list.findIndex((item) => item.id === targetId);
    if (from < 0 || to < 0 || from === to) return list;
    const next = [...list];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    return next;
  }

  function submitReorder(intent: "reorder-checklist" | "reorder-shopping" | "reorder-links" | "reorder-phones" | "reorder-faq", ids: number[], season?: "summer" | "winter") {
    const formData = new FormData();
    formData.set("intent", intent);
    formData.set("ids", JSON.stringify(ids));
    if (season) formData.set("season", season);
    formData.set("csrfToken", props.csrfToken);
    reorderFetcher.submit(formData, { method: "post", action: pageAction });
  }

  function onChecklistDrop(targetId: number) {
    if (!props.canWrite || dragChecklistId == null) return;
    const next = reorderById(localChecklist, dragChecklistId, targetId);
    setLocalChecklist(next);
    submitReorder("reorder-checklist", next.map((item) => item.id), props.selectedSeason);
    setDragChecklistId(null);
  }

  function onShoppingDrop(targetId: number) {
    if (!props.canWrite || dragShoppingId == null || dragShoppingId < 0 || targetId < 0) return;
    const next = reorderById(optimisticItems, dragShoppingId, targetId);
    setOptimisticItems(next);
    submitReorder(
      "reorder-shopping",
      next.map((item) => item.id).filter((id) => id > 0)
    );
    setDragShoppingId(null);
  }

  function onLinkDrop(targetId: number) {
    if (!props.canWrite || dragLinkId == null) return;
    const next = reorderById(localLinks, dragLinkId, targetId);
    setLocalLinks(next);
    submitReorder("reorder-links", next.map((item) => item.id));
    setDragLinkId(null);
  }

  function onPhoneDrop(targetId: number) {
    if (!props.canWrite || dragPhoneId == null) return;
    const next = reorderById(localPhoneNumbers, dragPhoneId, targetId);
    setLocalPhoneNumbers(next);
    submitReorder("reorder-phones", next.map((item) => item.id));
    setDragPhoneId(null);
  }

  function onFaqDrop(targetId: number) {
    if (!props.canWrite || dragFaqId == null) return;
    const next = reorderById(localFaq, dragFaqId, targetId);
    setLocalFaq(next);
    submitReorder("reorder-faq", next.map((item) => item.id));
    setDragFaqId(null);
  }

  return (
    <div className="grid gap-4 md:grid-cols-[1.8fr_1fr_1fr]">
      <section className="rounded-2xl border border-stone-300 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h2 className="mb-3 text-lg font-semibold">{props.msg.checklists}</h2>
        <div className="space-y-4">
          <div>
            <p className="mb-2 block text-xs font-semibold uppercase tracking-wide">{props.msg.season}</p>
            <div className="inline-flex overflow-hidden rounded-lg border border-stone-300 dark:border-slate-700">
              <a
                aria-current={props.selectedSeason === "winter" ? "page" : undefined}
                className={`px-3 py-1.5 text-sm ${
                  props.selectedSeason === "winter"
                    ? "bg-slate-900 text-white dark:bg-stone-200 dark:text-slate-900"
                    : "hover:bg-stone-200 dark:hover:bg-slate-800"
                }`}
                href={props.lang === "en" ? "/en?season=winter" : "/?index&season=winter"}
              >
                {props.msg.winter}
              </a>
              <a
                aria-current={props.selectedSeason === "summer" ? "page" : undefined}
                className={`px-3 py-1.5 text-sm ${
                  props.selectedSeason === "summer"
                    ? "bg-slate-900 text-white dark:bg-stone-200 dark:text-slate-900"
                    : "hover:bg-stone-200 dark:hover:bg-slate-800"
                }`}
                href={props.lang === "en" ? "/en?season=summer" : "/?index&season=summer"}
              >
                {props.msg.summer}
              </a>
            </div>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide">
              {props.selectedSeason === "winter" ? props.msg.winter : props.msg.summer}
            </h3>
            <ul className="space-y-2" key={props.selectedSeason}>
              {localChecklist.map((item) => (
                <li
                  className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                    ticks[item.id]
                      ? props.selectedSeason === "winter"
                        ? "border-slateNordic bg-slateNordic/15"
                        : "border-sageNordic bg-sageNordic/15"
                      : "border-stone-300 hover:bg-stone-100 dark:border-slate-700 dark:hover:bg-slate-800"
                  }`}
                  key={item.id}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => onChecklistDrop(item.id)}
                >
                  <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                    {props.canWrite ? (
                      <span
                        className="cursor-move rounded px-1 text-stone-500"
                        onDragEnd={() => setDragChecklistId(null)}
                        onDragStart={() => setDragChecklistId(item.id)}
                        draggable
                      >
                        ::
                      </span>
                    ) : null}
                    <input
                      checked={Boolean(ticks[item.id])}
                      className="h-4 w-4 rounded border-stone-400"
                      onChange={() => toggleTick(item.id)}
                      type="checkbox"
                    />
                    <span className={`whitespace-normal break-words ${ticks[item.id] ? "line-through opacity-75" : ""}`}>
                      {item.title}
                    </span>
                  </label>
                  {props.canWrite ? (
                    <details className="relative">
                      <summary className="list-none cursor-pointer rounded-md border border-stone-300 px-2 py-1 text-xs hover:bg-stone-100 dark:border-slate-700 dark:hover:bg-slate-800">
                        ...
                      </summary>
                      <div className="absolute right-0 z-10 mt-1 min-w-28 rounded-lg border border-stone-300 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                        <a
                          className="block rounded-md px-2 py-1 text-xs hover:bg-stone-100 dark:hover:bg-slate-800"
                          href={`${pageAction}&editTemplate=${item.id}`}
                        >
                          {props.msg.editLink}
                        </a>
                        <Form action={pageAction} method="post">
                          <input name="intent" type="hidden" value="delete-template" />
                          <input name="id" type="hidden" value={item.id} />
                          <input name="csrfToken" type="hidden" value={props.csrfToken} />
                          <button
                            className="block w-full rounded-md px-2 py-1 text-left text-xs hover:bg-stone-100 dark:hover:bg-slate-800"
                            type="submit"
                          >
                            {props.msg.delete}
                          </button>
                        </Form>
                      </div>
                    </details>
                  ) : null}
                </li>
              ))}
            </ul>
            {selectedChecklist.length === 0 ? (
              <p className="mt-2 text-sm text-stone-500">
                {props.lang === "no" ? "Ingen oppgaver for valgt sesong." : "No tasks for selected season."}
              </p>
            ) : null}
          </div>
          <button className="rounded-lg border border-stone-300 px-3 py-2 text-sm hover:bg-stone-100 dark:border-slate-700 dark:hover:bg-slate-800" onClick={clearTicks} type="button">
            {props.msg.resetList}
          </button>

          {props.canWrite ? (
            <Form
              action={pageAction}
              className="flex gap-2 border-t border-stone-200 pt-3 dark:border-slate-700"
              method="post"
              onSubmit={() => setPendingResetTemplate(true)}
              ref={addTemplateFormRef}
            >
              <input type="hidden" name="intent" value="add-template" />
              <input type="hidden" name="csrfToken" value={props.csrfToken} />
              <input type="hidden" name="season" value={props.selectedSeason} />
              <input
                className="min-w-0 flex-1 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                name="title"
                placeholder="Task"
                required
              />
              <button className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white dark:bg-stone-200 dark:text-slate-900" type="submit">
                +
              </button>
            </Form>
          ) : (
            <p className="text-sm text-stone-500">{props.msg.readOnlyMode}</p>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-stone-300 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h2 className="mb-3 text-lg font-semibold">{props.msg.shoppingList}</h2>
        <ul className="space-y-2">
          {mergedItems.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-2 rounded-lg border border-stone-300 px-3 py-2 dark:border-slate-700">
              <span
                className="min-w-0 flex flex-1 items-start gap-2 text-left text-sm"
                draggable={props.canWrite && item.id > 0}
                onDragEnd={() => setDragShoppingId(null)}
                onDragOver={(event) => event.preventDefault()}
                onDragStart={() => setDragShoppingId(item.id)}
                onDrop={() => onShoppingDrop(item.id)}
              >
                {props.canWrite && item.id > 0 ? <span className="cursor-move rounded px-1 text-stone-500">::</span> : null}
                <span className="whitespace-normal break-words">{item.name}</span>
              </span>
              {props.canWrite ? (
                <Form action={pageAction} method="post">
                  <input name="intent" type="hidden" value="remove-shopping" />
                  <input name="id" type="hidden" value={item.id} />
                  <input name="csrfToken" type="hidden" value={props.csrfToken} />
                  <button
                    className="rounded-md border border-stone-300 px-2 py-1 text-xs hover:bg-stone-100 dark:border-slate-700 dark:hover:bg-slate-800"
                    type="submit"
                  >
                    {props.msg.markBought}
                  </button>
                </Form>
              ) : null}
            </li>
          ))}
        </ul>
        {props.canWrite ? (
          <addFetcher.Form
            action={pageAction}
            className="mt-3 flex gap-2 border-t border-stone-200 pt-3 dark:border-slate-700"
            method="post"
            onSubmit={() => setPendingResetShopping(true)}
            ref={addShoppingFormRef}
          >
            <input type="hidden" name="intent" value="add-shopping" />
            <input type="hidden" name="csrfToken" value={props.csrfToken} />
            <input
              className="min-w-0 flex-1 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              name="name"
              placeholder={props.msg.addItem}
              required
            />
            <button className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white dark:bg-stone-200 dark:text-slate-900" type="submit">
              +
            </button>
          </addFetcher.Form>
        ) : null}
      </section>

      <section className="rounded-2xl border border-stone-300 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h2 className="mb-3 text-lg font-semibold">{props.msg.usefulNumbers}</h2>
        <div className="grid gap-2">
          {localPhoneNumbers.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-stone-300 px-3 py-2 text-sm dark:border-slate-700"
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => onPhoneDrop(item.id)}
            >
              <span
                className="min-w-0 flex items-start gap-2 hover:underline"
                draggable={props.canWrite}
                onDragEnd={() => setDragPhoneId(null)}
                onDragStart={() => setDragPhoneId(item.id)}
              >
                {props.canWrite ? <span className="cursor-move rounded px-1 text-stone-500">::</span> : null}
                <a className="whitespace-normal break-words" href={`tel:${item.phone_number}`}>
                  {item.title}
                </a>
              </span>
              {props.canWrite ? (
                <details className="relative shrink-0">
                  <summary className="list-none cursor-pointer rounded-md border border-stone-300 px-2 py-1 text-xs hover:bg-stone-100 dark:border-slate-700 dark:hover:bg-slate-800">
                    ...
                  </summary>
                  <div className="absolute right-0 z-10 mt-1 min-w-28 rounded-lg border border-stone-300 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                    <a
                      className="block rounded-md px-2 py-1 text-xs hover:bg-stone-100 dark:hover:bg-slate-800"
                      href={`${pageAction}&editPhone=${item.id}`}
                    >
                      {props.msg.editLink}
                    </a>
                    <Form action={pageAction} method="post">
                      <input name="intent" type="hidden" value="delete-phone" />
                      <input name="id" type="hidden" value={item.id} />
                      <input name="csrfToken" type="hidden" value={props.csrfToken} />
                      <button
                        className="block w-full rounded-md px-2 py-1 text-left text-xs hover:bg-stone-100 dark:hover:bg-slate-800"
                        type="submit"
                      >
                        {props.msg.delete}
                      </button>
                    </Form>
                  </div>
                </details>
              ) : null}
            </div>
          ))}
        </div>

        {props.canWrite ? (
          <details className="mt-3 rounded-lg border border-stone-200 p-2 dark:border-slate-700">
            <summary className="cursor-pointer select-none text-sm font-medium">{props.msg.addPhone}</summary>
            <Form
              action={pageAction}
              className="mt-2 space-y-2"
              method="post"
              onSubmit={() => setPendingResetPhone(true)}
              ref={addPhoneFormRef}
            >
              <input type="hidden" name="intent" value="add-phone" />
              <input type="hidden" name="csrfToken" value={props.csrfToken} />
              <input className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" name="title_no" placeholder="Tittel (NO)" required />
              <input className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" name="title_en" placeholder="Title (EN)" required />
              <input className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" name="phone_number" placeholder="112" required type="tel" />
              <button className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white dark:bg-stone-200 dark:text-slate-900" type="submit">
                {props.msg.save}
              </button>
            </Form>
          </details>
        ) : null}

        <h2 className="mt-6 mb-3 text-lg font-semibold">{props.msg.externalLinks}</h2>
        <div className="grid gap-2">
          {localLinks.map((item) => {
            const Icon = linkIcon(item.icon);
            return (
              <div
                key={item.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-stone-300 px-3 py-2 text-sm dark:border-slate-700"
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => onLinkDrop(item.id)}
              >
                <a
                  className="min-w-0 flex items-start gap-2 hover:underline"
                  href={item.url}
                  draggable={props.canWrite}
                  onDragEnd={() => setDragLinkId(null)}
                  onDragStart={() => setDragLinkId(item.id)}
                  rel="noreferrer"
                  target="_blank"
                >
                  {props.canWrite ? <span className="cursor-move rounded px-1 text-stone-500">::</span> : null}
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="whitespace-normal break-words">{item.title}</span>
                </a>
                {props.canWrite ? (
                  <details className="relative shrink-0">
                    <summary className="list-none cursor-pointer rounded-md border border-stone-300 px-2 py-1 text-xs hover:bg-stone-100 dark:border-slate-700 dark:hover:bg-slate-800">
                      ...
                    </summary>
                    <div className="absolute right-0 z-10 mt-1 min-w-28 rounded-lg border border-stone-300 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                      <a
                        className="block rounded-md px-2 py-1 text-xs hover:bg-stone-100 dark:hover:bg-slate-800"
                        href={`${pageAction}&editLink=${item.id}`}
                      >
                        {props.msg.editLink}
                      </a>
                      <Form action={pageAction} method="post">
                        <input name="intent" type="hidden" value="delete-link" />
                        <input name="id" type="hidden" value={item.id} />
                        <input name="csrfToken" type="hidden" value={props.csrfToken} />
                        <button
                          className="block w-full rounded-md px-2 py-1 text-left text-xs hover:bg-stone-100 dark:hover:bg-slate-800"
                          type="submit"
                        >
                          {props.msg.delete}
                        </button>
                      </Form>
                    </div>
                  </details>
                ) : null}
              </div>
            );
          })}
        </div>

        {props.canWrite ? (
          <details className="mt-3 rounded-lg border border-stone-200 p-2 dark:border-slate-700">
            <summary className="cursor-pointer select-none text-sm font-medium">{props.msg.addLink}</summary>
            <Form
              action={pageAction}
              className="mt-2 space-y-2"
              method="post"
              onSubmit={() => setPendingResetLink(true)}
              ref={addLinkFormRef}
            >
              <input type="hidden" name="intent" value="add-link" />
              <input type="hidden" name="csrfToken" value={props.csrfToken} />
              <input className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" name="title_no" placeholder="Tittel (NO)" required />
              <input className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" name="title_en" placeholder="Title (EN)" required />
              <input className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" name="url" placeholder="https://..." required type="url" />
              <button className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white dark:bg-stone-200 dark:text-slate-900" type="submit">
                {props.msg.save}
              </button>
            </Form>
          </details>
        ) : null}
      </section>

      {props.canWrite && editingLink ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4"
          onClick={() => navigate(pageAction)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-stone-300 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-900"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="mb-3 text-base font-semibold">{props.msg.editLink}</h3>
            <Form action={pageAction} className="space-y-2" method="post">
              <input type="hidden" name="intent" value="update-link" />
              <input type="hidden" name="id" value={editingLink.id} />
              <input type="hidden" name="csrfToken" value={props.csrfToken} />
              <input
                className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                defaultValue={editingLink.title_no}
                name="title_no"
                placeholder="Tittel (NO)"
                required
              />
              <input
                className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                defaultValue={editingLink.title_en}
                name="title_en"
                placeholder="Title (EN)"
                required
              />
              <input
                className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                defaultValue={editingLink.url}
                name="url"
                placeholder="https://..."
                required
                type="url"
              />
              <div className="flex gap-2">
                <a
                  className="rounded-lg border border-stone-300 px-3 py-2 text-center text-sm hover:bg-stone-100 dark:border-slate-700 dark:hover:bg-slate-800"
                  href={pageAction}
                >
                  {props.msg.cancel}
                </a>
                <button className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white dark:bg-stone-200 dark:text-slate-900" type="submit">
                  {props.msg.save}
                </button>
              </div>
            </Form>
          </div>
        </div>
      ) : null}

      {props.canWrite && editingPhoneNumber ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4"
          onClick={() => navigate(pageAction)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-stone-300 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-900"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="mb-3 text-base font-semibold">{props.msg.editLink}</h3>
            <Form action={pageAction} className="space-y-2" method="post">
              <input type="hidden" name="intent" value="update-phone" />
              <input type="hidden" name="id" value={editingPhoneNumber.id} />
              <input type="hidden" name="csrfToken" value={props.csrfToken} />
              <input
                className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                defaultValue={editingPhoneNumber.title_no}
                name="title_no"
                placeholder="Tittel (NO)"
                required
              />
              <input
                className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                defaultValue={editingPhoneNumber.title_en}
                name="title_en"
                placeholder="Title (EN)"
                required
              />
              <input
                className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                defaultValue={editingPhoneNumber.phone_number}
                name="phone_number"
                placeholder="112"
                required
                type="tel"
              />
              <div className="flex gap-2">
                <a
                  className="rounded-lg border border-stone-300 px-3 py-2 text-center text-sm hover:bg-stone-100 dark:border-slate-700 dark:hover:bg-slate-800"
                  href={pageAction}
                >
                  {props.msg.cancel}
                </a>
                <button className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white dark:bg-stone-200 dark:text-slate-900" type="submit">
                  {props.msg.save}
                </button>
              </div>
            </Form>
          </div>
        </div>
      ) : null}

      {props.canWrite && editingTemplate ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-md rounded-2xl border border-stone-300 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <h3 className="mb-3 text-base font-semibold">{props.msg.editLink}</h3>
            <Form action={pageAction} className="space-y-2" method="post">
              <input type="hidden" name="intent" value="update-template" />
              <input type="hidden" name="id" value={editingTemplate.id} />
              <input type="hidden" name="csrfToken" value={props.csrfToken} />
              <input
                className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                defaultValue={editingTemplate.title}
                name="title"
                required
              />
              <select
                className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                defaultValue={editingTemplate.season}
                name="season"
                required
              >
                <option value="summer">{props.msg.summer}</option>
                <option value="winter">{props.msg.winter}</option>
              </select>
              <div className="flex gap-2">
                <a
                  className="rounded-lg border border-stone-300 px-3 py-2 text-center text-sm hover:bg-stone-100 dark:border-slate-700 dark:hover:bg-slate-800"
                  href={pageAction}
                >
                  {props.msg.cancel}
                </a>
                <button className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white dark:bg-stone-200 dark:text-slate-900" type="submit">
                  {props.msg.save}
                </button>
              </div>
            </Form>
          </div>
        </div>
      ) : null}

      {props.canWrite && props.showUsersModal ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4"
          onClick={() => navigate(pageAction)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-stone-300 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-900"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="mb-3 text-base font-semibold">{props.msg.users}</h3>
            <Form action={usersModalHref} className="space-y-2" method="post">
              <input name="intent" type="hidden" value="create-user" />
              <input name="csrfToken" type="hidden" value={props.csrfToken} />
              <input
                className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                name="email"
                placeholder="Email"
                required
                type="email"
              />
              <input
                className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                minLength={4}
                name="password"
                placeholder="Password (min 4)"
                required
                type="password"
              />
              <div className="flex gap-2">
                <a
                  className="rounded-lg border border-stone-300 px-3 py-2 text-center text-sm hover:bg-stone-100 dark:border-slate-700 dark:hover:bg-slate-800"
                  href={pageAction}
                >
                  {props.msg.cancel}
                </a>
                <button className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white dark:bg-stone-200 dark:text-slate-900" type="submit">
                  {props.msg.createUser}
                </button>
              </div>
            </Form>
          </div>
        </div>
      ) : null}

      <section className="rounded-2xl border border-stone-300 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 md:col-span-3">
        <h2 className="mb-3 text-lg font-semibold">{props.msg.faq}</h2>
        <input
          className="mb-3 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
          onChange={(event) => setFaqSearch(event.currentTarget.value)}
          placeholder={props.msg.searchFaq}
          type="search"
          value={faqSearch}
        />
        <div className="space-y-2">
          {filteredFaq.map((item) => (
            <div
              className="flex items-start gap-2"
              key={item.id}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => onFaqDrop(item.id)}
            >
              {props.canWrite ? (
                <span
                  className="mt-2 cursor-move rounded px-1 text-stone-500"
                  draggable
                  onDragEnd={() => setDragFaqId(null)}
                  onDragStart={() => setDragFaqId(item.id)}
                >
                  ::
                </span>
              ) : null}
              <details className="flex-1 rounded-lg border border-stone-300 p-2 dark:border-slate-700">
                <summary className="cursor-pointer select-none text-sm font-medium">{item.question}</summary>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm text-stone-700 dark:text-stone-200">{item.answer}</p>
                {props.canWrite ? (
                  <div className="mt-2 flex items-center gap-2">
                    <a
                      className="rounded-md border border-stone-300 px-2 py-1 text-xs hover:bg-stone-100 dark:border-slate-700 dark:hover:bg-slate-800"
                      href={`${pageAction}&editFaq=${item.id}`}
                    >
                      {props.msg.editLink}
                    </a>
                    <Form action={pageAction} method="post">
                      <input name="intent" type="hidden" value="delete-faq" />
                      <input name="id" type="hidden" value={item.id} />
                      <input name="csrfToken" type="hidden" value={props.csrfToken} />
                      <button
                        className="rounded-md border border-stone-300 px-2 py-1 text-xs hover:bg-stone-100 dark:border-slate-700 dark:hover:bg-slate-800"
                        type="submit"
                      >
                        {props.msg.delete}
                      </button>
                    </Form>
                  </div>
                ) : null}
              </details>
            </div>
          ))}
          {filteredFaq.length === 0 ? <p className="text-sm text-stone-500">{props.msg.noFaqMatches}</p> : null}
        </div>
        {props.canWrite ? (
          <details className="mt-3 rounded-lg border border-stone-200 p-2 dark:border-slate-700">
            <summary className="cursor-pointer select-none text-sm font-medium">{props.msg.addFaq}</summary>
            <Form action={pageAction} className="mt-2 space-y-2" method="post" onSubmit={() => setPendingResetFaq(true)} ref={addFaqFormRef}>
              <input name="intent" type="hidden" value="add-faq" />
              <input name="csrfToken" type="hidden" value={props.csrfToken} />
              <input className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" name="question_no" placeholder={`${props.msg.question} (NO)`} required />
              <input className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" name="question_en" placeholder={`${props.msg.question} (EN)`} />
              <textarea className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" name="answer_no" placeholder={`${props.msg.answer} (NO)`} required rows={3} />
              <textarea className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" name="answer_en" placeholder={`${props.msg.answer} (EN)`} rows={3} />
              <button className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white dark:bg-stone-200 dark:text-slate-900" type="submit">
                {props.msg.save}
              </button>
            </Form>
          </details>
        ) : null}
      </section>

      {props.canWrite && editingFaq ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-stone-300 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <h3 className="mb-3 text-base font-semibold">{props.msg.editLink}</h3>
            <Form action={pageAction} className="space-y-2" method="post">
              <input name="intent" type="hidden" value="update-faq" />
              <input name="id" type="hidden" value={editingFaq.id} />
              <input name="csrfToken" type="hidden" value={props.csrfToken} />
              <input className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" defaultValue={editingFaq.question_no} name="question_no" required />
              <input className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" defaultValue={editingFaq.question_en} name="question_en" required />
              <textarea className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" defaultValue={editingFaq.answer_no} name="answer_no" required rows={3} />
              <textarea className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" defaultValue={editingFaq.answer_en} name="answer_en" required rows={3} />
              <div className="flex gap-2">
                <a
                  className="rounded-lg border border-stone-300 px-3 py-2 text-center text-sm hover:bg-stone-100 dark:border-slate-700 dark:hover:bg-slate-800"
                  href={pageAction}
                >
                  {props.msg.cancel}
                </a>
                <button className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white dark:bg-stone-200 dark:text-slate-900" type="submit">
                  {props.msg.save}
                </button>
              </div>
            </Form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
