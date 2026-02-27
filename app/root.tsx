import type { LinksFunction, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, Links, LiveReload, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData, useLocation } from "@remix-run/react";
import { Cloud, CloudFog, CloudRain, CloudSnow, Moon, Sun, Waves, Wind } from "lucide-react";
import { useEffect, useState } from "react";
import stylesheet from "~/styles/tailwind.css?url";
import { getOptionalUser } from "~/lib/auth.server";
import { getOrCreateCsrfToken } from "~/lib/csrf.server";
import { commitSession, getSession } from "~/lib/session.server";
import { t } from "~/lib/i18n";
import { getYrWeatherNow } from "~/lib/weather.server";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: stylesheet },
  { rel: "icon", href: "/favicon.ico" },
  { rel: "apple-touch-icon", href: "/apple-touch-icon.png" }
];

export async function loader({ request }: LoaderFunctionArgs) {
  const path = new URL(request.url).pathname;
  const lang = path === "/en" || path.startsWith("/en/") ? "en" : "no";
  const session = await getSession(request.headers.get("Cookie"));
  const csrfToken = getOrCreateCsrfToken(session);
  const user = await getOptionalUser(request);
  const msg = t(lang);
  const weather = await getYrWeatherNow();
  const cabinLabel = process.env.CABIN_LABEL ?? msg.dashboard;

  return json(
    { lang, msg, user, csrfToken, weather, cabinLabel },
    {
      headers: {
        "Set-Cookie": await commitSession(session)
      }
    }
  );
}

function windDirectionLabel(deg: number): string {
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const index = Math.round((((deg % 360) + 360) % 360) / 45) % 8;
  return directions[index] ?? "N";
}

function weatherIcon(symbolCode: string | null) {
  const code = (symbolCode ?? "").toLowerCase();
  if (code.includes("snow")) return CloudSnow;
  if (code.includes("rain") || code.includes("sleet")) return CloudRain;
  if (code.includes("fog")) return CloudFog;
  if (code.includes("cloud")) return Cloud;
  return Sun;
}

function weatherConditionLabel(symbolCode: string | null, lang: "no" | "en", clearLabel: string): string {
  const normalized = (symbolCode ?? "").toLowerCase().replace(/_(day|night|polartwilight)$/, "");
  const labelsNo: Record<string, string> = {
    clearsky: "Klart",
    fair: "Lettskyet",
    partlycloudy: "Delvis skyet",
    cloudy: "Skyet",
    fog: "Tåke",
    rain: "Regn",
    lightrain: "Lett regn",
    heavyrain: "Kraftig regn",
    rainshowers: "Regnbyger",
    lightrainshowers: "Lette regnbyger",
    heavyrainshowers: "Kraftige regnbyger",
    sleet: "Sludd",
    sleetshowers: "Sluddbyger",
    snow: "Snø",
    lightsnow: "Lett snø",
    heavysnow: "Kraftig snø",
    snowshowers: "Snøbyger",
    lightsnowshowers: "Lette snøbyger",
    heavysnowshowers: "Kraftige snøbyger",
    rainandthunder: "Regn og torden",
    snowandthunder: "Snø og torden",
    sleetandthunder: "Sludd og torden"
  };
  const labelsEn: Record<string, string> = {
    clearsky: "Clear",
    fair: "Fair",
    partlycloudy: "Partly cloudy",
    cloudy: "Cloudy",
    fog: "Fog",
    rain: "Rain",
    lightrain: "Light rain",
    heavyrain: "Heavy rain",
    rainshowers: "Rain showers",
    lightrainshowers: "Light rain showers",
    heavyrainshowers: "Heavy rain showers",
    sleet: "Sleet",
    sleetshowers: "Sleet showers",
    snow: "Snow",
    lightsnow: "Light snow",
    heavysnow: "Heavy snow",
    snowshowers: "Snow showers",
    lightsnowshowers: "Light snow showers",
    heavysnowshowers: "Heavy snow showers",
    rainandthunder: "Rain and thunder",
    snowandthunder: "Snow and thunder",
    sleetandthunder: "Sleet and thunder"
  };
  const labels = lang === "no" ? labelsNo : labelsEn;
  return labels[normalized] ?? clearLabel;
}

function localizedWindDirectionLabel(deg: number, lang: "no" | "en"): string {
  if (lang === "en") return windDirectionLabel(deg);
  const noMap: Record<string, string> = { N: "N", NE: "NØ", E: "Ø", SE: "SØ", S: "S", SW: "SV", W: "V", NW: "NV" };
  const base = windDirectionLabel(deg);
  return noMap[base] ?? base;
}

export default function App() {
  const data = useLoaderData<typeof loader>();
  const location = useLocation();
  const themeStorageKey = "hytta:theme";
  const fontScaleStorageKey = "hytta:fontScale";
  const showLanguageSelector = false;
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [fontScale, setFontScale] = useState(100);
  const langPrefix = data.lang === "en" ? "/en" : "";
  const pathWithoutEn = location.pathname.replace(/^\/en/, "") || "/";
  const hrefNo = `${pathWithoutEn}${location.search}`;
  const hrefEn = `/en${pathWithoutEn === "/" ? "" : pathWithoutEn}${location.search}`;
  const usersSearchParams = new URLSearchParams(location.search);
  usersSearchParams.set("manageUsers", "1");
  const usersHref = `${location.pathname}?${usersSearchParams.toString()}`;

  useEffect(() => {
    const stored = window.localStorage.getItem(themeStorageKey);
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initial: "light" | "dark" =
      stored === "dark" || stored === "light"
        ? (stored as "light" | "dark")
        : prefersDark
          ? "dark"
          : "light";
    setTheme(initial);
    document.documentElement.classList.toggle("dark", initial === "dark");
  }, [themeStorageKey]);

  useEffect(() => {
    const stored = Number(window.localStorage.getItem(fontScaleStorageKey) ?? "100");
    const initial = Number.isFinite(stored) ? Math.min(125, Math.max(85, stored)) : 100;
    setFontScale(initial);
    document.documentElement.style.fontSize = `${initial}%`;
  }, [fontScaleStorageKey]);

  function toggleTheme() {
    setTheme((current) => {
      const next: "light" | "dark" = current === "dark" ? "light" : "dark";
      window.localStorage.setItem(themeStorageKey, next);
      document.documentElement.classList.toggle("dark", next === "dark");
      return next;
    });
  }

  function adjustFontScale(delta: number) {
    setFontScale((current) => {
      const next = Math.min(125, Math.max(85, current + delta));
      window.localStorage.setItem(fontScaleStorageKey, String(next));
      document.documentElement.style.fontSize = `${next}%`;
      return next;
    });
  }

  return (
    <html lang={data.lang}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <div className="mx-auto min-h-screen max-w-6xl px-4 py-4 md:px-6 md:py-6">
          <header className="mb-4 rounded-2xl border border-stone-300/60 bg-stone-50/80 p-4 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/80">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">{data.msg.appName}</h1>
                <p className="text-sm text-stone-600 dark:text-stone-300">{data.cabinLabel}</p>
              </div>
              <a
                className="min-w-[16rem] rounded-xl border border-stone-300 bg-white/80 px-3 py-2 text-sm text-stone-700 shadow-sm transition hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 dark:border-slate-700 dark:bg-slate-900/80 dark:text-stone-200 dark:hover:bg-slate-800"
                href={data.weather?.yrUrl}
                rel={data.weather ? "noopener noreferrer" : undefined}
                target={data.weather ? "_blank" : undefined}
              >
                {data.weather ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-1.5">
                        {(() => {
                          const Icon = weatherIcon(data.weather.symbolCode);
                          return <Icon className="h-3.5 w-3.5 text-stone-500 dark:text-stone-300" />;
                        })()}
                        <span className="truncate text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">
                          {weatherConditionLabel(data.weather.symbolCode, data.lang, data.msg.weatherClear)}
                        </span>
                      </div>
                      <span className="text-xs font-semibold">{data.weather.temperatureC}°C</span>
                    </div>
                    <div className="flex items-center gap-1.5 whitespace-nowrap text-xs text-stone-600 dark:text-stone-300">
                      <Wind className="h-3.5 w-3.5 text-stone-500 dark:text-stone-300" />
                      <span>
                        {data.weather.windMs} m/s {localizedWindDirectionLabel(data.weather.windDirectionDeg, data.lang)}
                      </span>
                      <span>•</span>
                      {data.weather.symbolCode?.toLowerCase().includes("snow") ? (
                        <CloudSnow className="h-3.5 w-3.5 text-stone-500 dark:text-stone-300" />
                      ) : (
                        <CloudRain className="h-3.5 w-3.5 text-stone-500 dark:text-stone-300" />
                      )}
                      <span>{data.weather.precipitationMm} mm</span>
                      <span>•</span>
                      <Cloud className="h-3.5 w-3.5 text-stone-500 dark:text-stone-300" />
                      <span>{data.weather.cloudPct}%</span>
                      <span>•</span>
                      <Waves className="h-3.5 w-3.5 text-stone-500 dark:text-stone-300" />
                      <span>{data.weather.humidityPct}%</span>
                    </div>
                  </div>
                ) : (
                  <span className="text-xs text-stone-500 dark:text-stone-400">{data.msg.weatherUnavailable}</span>
                )}
              </a>
              <div className="flex items-center gap-2">
                <button
                  className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-200 dark:border-slate-700 dark:hover:bg-slate-800"
                  aria-label={theme === "dark" ? data.msg.light : data.msg.dark}
                  onClick={toggleTheme}
                  title={theme === "dark" ? data.msg.light : data.msg.dark}
                  type="button"
                >
                  {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </button>
                <div className="inline-flex overflow-hidden rounded-lg border border-stone-300 dark:border-slate-700">
                  <button
                    className="px-2 py-1.5 text-sm hover:bg-stone-200 dark:hover:bg-slate-800"
                    onClick={() => adjustFontScale(-5)}
                    title="Smaller text"
                    type="button"
                  >
                    A-
                  </button>
                  <button
                    className="px-2 py-1.5 text-sm hover:bg-stone-200 dark:hover:bg-slate-800"
                    onClick={() => adjustFontScale(5)}
                    title="Larger text"
                    type="button"
                  >
                    A+
                  </button>
                </div>
                {showLanguageSelector ? (
                  <div className="inline-flex overflow-hidden rounded-lg border border-stone-300 dark:border-slate-700">
                    <a
                      aria-current={data.lang === "no" ? "page" : undefined}
                      className={`px-3 py-1.5 text-sm ${
                        data.lang === "no"
                          ? "bg-slate-900 text-white dark:bg-stone-200 dark:text-slate-900"
                          : "hover:bg-stone-200 dark:hover:bg-slate-800"
                      }`}
                      href={hrefNo}
                    >
                      Norsk
                    </a>
                    <a
                      aria-current={data.lang === "en" ? "page" : undefined}
                      className={`px-3 py-1.5 text-sm ${
                        data.lang === "en"
                          ? "bg-slate-900 text-white dark:bg-stone-200 dark:text-slate-900"
                          : "hover:bg-stone-200 dark:hover:bg-slate-800"
                      }`}
                      href={hrefEn}
                    >
                      English
                    </a>
                  </div>
                ) : null}
                {data.user ? (
                  <>
                    <a
                      className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-200 dark:border-slate-700 dark:hover:bg-slate-800"
                      href={usersHref}
                    >
                      {data.msg.users}
                    </a>
                    <Form method="post" action={`${langPrefix}/logout`}>
                      <input type="hidden" name="csrfToken" value={data.csrfToken} />
                      <button className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm text-white dark:bg-stone-200 dark:text-slate-900" type="submit">
                        {data.msg.logout}
                      </button>
                    </Form>
                  </>
                ) : (
                  <a
                    className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm text-white dark:bg-stone-200 dark:text-slate-900"
                    href={`${langPrefix}/login`}
                  >
                    {data.msg.login}
                  </a>
                )}
              </div>
            </div>
          </header>
          <Outlet context={data} />
        </div>
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}
