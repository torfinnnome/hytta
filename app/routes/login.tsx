import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, useActionData, useRouteLoaderData } from "@remix-run/react";
import { countUsers, createUser, createUserSession, getOptionalUser, verifyLogin } from "~/lib/auth.server";
import { requireValidCsrf } from "~/lib/csrf.server";
import { langFromRequest, langPrefix } from "~/lib/lang.server";
import { getSession, commitSession } from "~/lib/session.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await getOptionalUser(request);
  if (user) {
    const lang = langFromRequest(request);
    return redirect(langPrefix(lang) || "/");
  }
  return json({ ok: true });
}

export async function action({ request }: ActionFunctionArgs) {
  const lang = langFromRequest(request);
  const prefix = langPrefix(lang);
  const session = await getSession(request.headers.get("Cookie"));
  const formData = await request.formData();
  await requireValidCsrf(formData, session);

  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  if (!email || !password) {
    return json({ error: "required" }, { status: 400, headers: { "Set-Cookie": await commitSession(session) } });
  }

  if (countUsers() === 0 && process.env.BOOTSTRAP_ADMIN_EMAIL && process.env.BOOTSTRAP_ADMIN_PASSWORD) {
    await createUser(process.env.BOOTSTRAP_ADMIN_EMAIL, process.env.BOOTSTRAP_ADMIN_PASSWORD, "admin");
  }

  const user = await verifyLogin(email, password);
  if (!user) {
    return json({ error: "invalid" }, { status: 401, headers: { "Set-Cookie": await commitSession(session) } });
  }

  return createUserSession(user, request, prefix || "/");
}

export default function LoginRoute() {
  const actionData = useActionData<typeof action>();
  const root = useRouteLoaderData("root") as {
    msg: {
      login: string;
      email: string;
      password: string;
      forgotPassword: string;
      invalidCredentials: string;
      requiredField: string;
    };
    lang: "no" | "en";
    csrfToken: string;
  };

  const prefix = root.lang === "en" ? "/en" : "";
  const error =
    actionData?.error === "invalid"
      ? root.msg.invalidCredentials
      : actionData?.error === "required"
        ? root.msg.requiredField
        : null;

  return (
    <main className="mx-auto max-w-md rounded-2xl border border-stone-300 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <h2 className="mb-4 text-xl font-semibold">{root.msg.login}</h2>
      <Form className="space-y-3" method="post">
        <input type="hidden" name="csrfToken" value={root.csrfToken} />
        <input className="w-full rounded-lg border border-stone-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-900" name="email" placeholder={root.msg.email} required type="email" />
        <input className="w-full rounded-lg border border-stone-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-900" minLength={4} name="password" placeholder={root.msg.password} required type="password" />
        {error ? <p className="text-sm text-red-700 dark:text-red-400">{error}</p> : null}
        <button className="w-full rounded-lg bg-slate-900 px-3 py-2 text-white dark:bg-stone-200 dark:text-slate-900" type="submit">
          {root.msg.login}
        </button>
      </Form>
      <a className="mt-3 inline-block text-sm underline" href={`${prefix}/forgot-password`}>
        {root.msg.forgotPassword}
      </a>
    </main>
  );
}
