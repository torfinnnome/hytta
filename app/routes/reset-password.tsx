import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, useActionData, useSearchParams, useRouteLoaderData } from "@remix-run/react";
import { requireValidCsrf } from "~/lib/csrf.server";
import { resetPassword } from "~/lib/password-reset.server";
import { commitSession, getSession } from "~/lib/session.server";

export async function action({ request }: ActionFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const formData = await request.formData();
  await requireValidCsrf(formData, session);

  const token = String(formData.get("token") || "");
  const password = String(formData.get("password") || "");
  if (!token || password.length < 4) {
    return json({ ok: false }, { status: 400, headers: { "Set-Cookie": await commitSession(session) } });
  }

  const ok = await resetPassword(token, password);
  return json({ ok }, { headers: { "Set-Cookie": await commitSession(session) } });
}

export default function ResetPasswordRoute() {
  const [params] = useSearchParams();
  const root = useRouteLoaderData("root") as {
    msg: {
      resetPassword: string;
      setNewPassword: string;
      password: string;
      save: string;
    };
    csrfToken: string;
    lang: "no" | "en";
  };
  const actionData = useActionData<typeof action>();

  const loginPath = root.lang === "en" ? "/en/login" : "/login";

  return (
    <main className="mx-auto max-w-md rounded-2xl border border-stone-300 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <h2 className="mb-4 text-xl font-semibold">{root.msg.resetPassword}</h2>
      <Form className="space-y-3" method="post">
        <input type="hidden" name="csrfToken" value={root.csrfToken} />
        <input type="hidden" name="token" value={params.get("token") ?? ""} />
        <input className="w-full rounded-lg border border-stone-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-900" minLength={4} name="password" placeholder={root.msg.password} required type="password" />
        <button className="w-full rounded-lg bg-slate-900 px-3 py-2 text-white dark:bg-stone-200 dark:text-slate-900" type="submit">
          {root.msg.setNewPassword}
        </button>
      </Form>
      {actionData ? (
        actionData.ok ? (
          <p className="mt-3 text-sm text-sageNordic">
            OK. <a className="underline" href={loginPath}>Login</a>
          </p>
        ) : (
          <p className="mt-3 text-sm text-red-700 dark:text-red-400">Invalid or expired token.</p>
        )
      ) : null}
    </main>
  );
}
