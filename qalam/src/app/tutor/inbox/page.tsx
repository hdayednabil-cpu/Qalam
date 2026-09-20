import { requireUser } from "@/lib/auth";
import { InboxPage } from "@/components/inbox";
export const dynamic = "force-dynamic";
export default async function Page() {
  const user = await requireUser("tutor");
  return <InboxPage userId={user.id} />;
}
