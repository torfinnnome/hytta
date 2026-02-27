import type { ActionFunctionArgs } from "@remix-run/node";
import { langFromRequest, langPrefix } from "~/lib/lang.server";
import { getSession } from "~/lib/session.server";
import { requireValidCsrf } from "~/lib/csrf.server";
import { logout } from "~/lib/auth.server";

export async function action({ request }: ActionFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const formData = await request.formData();
  await requireValidCsrf(formData, session);

  const response = await logout(request);
  const lang = langFromRequest(request);
  const prefix = langPrefix(lang);
  response.headers.set("Location", prefix || "/");
  return response;
}
