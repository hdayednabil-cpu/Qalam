import { getViewer } from "@/lib/auth";
import { InboxPage } from "@/components/inbox";
export const dynamic = "force-dynamic";
export default async function Page() {
  const v = await getViewer("guardian");
  return <InboxPage userId={v.user.id} />;
}
