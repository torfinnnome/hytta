import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, useActionData, useRouteLoaderData } from "@remix-run/react";
import { requireValidCsrf } from "~/lib/csrf.server";
import { requestPasswordReset } from "~/lib/password-reset.server";
import { commitSession, getSession } from "~/lib/session.server";

export async function action({ request }: ActionFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const formData = await request.formData();
  await requireValidCsrf(formData, session);

  const email = String(formData.get("email") || "").trim();
  if (email) await requestPasswordReset(email);

  return json({ ok: true }, { headers: { "Set-Cookie": await commitSession(session) } });
}

export default function ForgotPasswordRoute() {
  const root = useRouteLoaderData("root") as {
    msg: {
      forgotPassword: string;
      requestResetSent: string;
      email: string;
      save: string;
    };
    csrfToken: string;
  };

  const actionData = useActionData<typeof action>();

  return (
    <main className="mx-auto max-w-md rounded-2xl border border-stone-300 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <h2 className="mb-4 text-xl font-semibold">{root.msg.forgotPassword}</h2>
      <Form className="space-y-3" method="post">
        <input type="hidden" name="csrfToken" value={root.csrfToken} />
        <input className="w-full rounded-lg border border-stone-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-900" name="email" placeholder={root.msg.email} required type="email" />
        <button className="w-full rounded-lg bg-slate-900 px-3 py-2 text-white dark:bg-stone-200 dark:text-slate-900" type="submit">
          {root.msg.save}
        </button>
      </Form>
      {actionData?.ok ? <p className="mt-3 text-sm text-sageNordic">{root.msg.requestResetSent}</p> : null}
    </main>
  );
}
