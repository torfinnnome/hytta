import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { useLoaderData, useRouteLoaderData } from "@remix-run/react";
import { Dashboard } from "~/components/dashboard";
import { dashboardAction, dashboardLoader } from "~/lib/dashboard.server";

export const meta: MetaFunction = () => [{ title: "Hytta" }];

export async function loader({ request }: LoaderFunctionArgs) {
  return dashboardLoader(request);
}

export async function action({ request }: ActionFunctionArgs) {
  return dashboardAction(request);
}

export default function Index() {
  const data = useLoaderData<typeof loader>();
  const rootData = useRouteLoaderData("root") as { csrfToken: string };

  return (
    <Dashboard
      checklist={data.checklist}
      canWrite={data.canWrite}
      csrfToken={rootData.csrfToken}
      editingFaqId={data.editingFaqId}
      editingLinkId={data.editingLinkId}
      editingPhoneNumberId={data.editingPhoneNumberId}
      editingTemplateId={data.editingTemplateId}
      faqEntries={data.faqEntries}
      lang={data.lang}
      links={data.links}
      msg={data.msg}
      phoneNumbers={data.phoneNumbers}
      selectedSeason={data.selectedSeason}
      showUsersModal={data.showUsersModal}
      shoppingItems={data.shoppingItems}
    />
  );
}
