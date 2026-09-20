import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import * as sch from "@/db/schema";
import { t } from "@/lib/i18n";
import { formatDateTime } from "@/lib/dates";
import { Card, EmptyState, PageHeader, cx } from "./ui";
import { markReadAction } from "@/app/tutor/actions";

/** Shared notifications inbox for every role. */
export async function InboxPage({ userId }: { userId: string }) {
  const items = await getDb().query.notifications.findMany({ where: eq(sch.notifications.userId, userId), orderBy: [desc(sch.notifications.createdAt)], limit: 50 });
  const unread = items.filter((n) => !n.readAt).length;
  return (
    <div className="max-w-2xl">
      <PageHeader title={t("nav.inbox")} subtitle={unread ? `${unread} unread` : t("common.allCaughtUp")} action={unread ? <form action={markReadAction}><button className="btn-secondary" type="submit">Mark all read</button></form> : undefined} />
      <Card padded={false}>
        {items.length ? (
          <ul className="divide-y divide-line/70">
            {items.map((n) => (
              <li key={n.id} className={cx("px-5 py-3", !n.readAt && "bg-saffron-100/40")}>
                <Link href={n.link ?? "#"} className="block">
                  <div className="flex items-start gap-2">
                    {!n.readAt && <span className="mt-2 size-2 rounded-full bg-saffron-500 shrink-0" />}
                    <div>
                      <div className="text-sm font-medium">{n.title}</div>
                      {n.body && <div className="text-sm text-mute">{n.body}</div>}
                      <div className="text-xs text-mute mt-0.5">{formatDateTime(n.createdAt)}</div>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="p-5"><EmptyState>{t("common.nothingHere")}</EmptyState></div>
        )}
      </Card>
    </div>
  );
}
