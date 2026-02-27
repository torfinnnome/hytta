import type { Lang } from "~/lib/i18n";

export function langFromRequest(request: Request): Lang {
  const path = new URL(request.url).pathname;
  return path === "/en" || path.startsWith("/en/") ? "en" : "no";
}

export function langPrefix(lang: Lang): string {
  return lang === "en" ? "/en" : "";
}
