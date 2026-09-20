import Link from "next/link";
import { getDb } from "@/db";
import { requireUser } from "@/lib/auth";
import { searchAll } from "@/lib/queries";
import { t } from "@/lib/i18n";
import { Avatar, Card, EmptyState, MasteryDot, PageHeader } from "@/components/ui";
import { HomeworkRow, TestRow } from "@/components/items";

export const dynamic = "force-dynamic";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const user = await requireUser("tutor");
  const r = await searchAll(getDb(), user, q);
  const total = r.students.length + r.topics.length + r.homework.length + r.tests.length + r.resources.length;
  return (
    <div className="space-y-5">
      <PageHeader title={t("nav.search")} />
      <form className="flex gap-2 max-w-xl">
        <input name="q" defaultValue={q} className="input" placeholder={t("tutor.search")} autoFocus />
        <button className="btn-primary" type="submit">{t("nav.search")}</button>
      </form>
      {q && !total && <EmptyState>No matches for “{q}”.</EmptyState>}
      {r.students.length > 0 && (
        <Card title={t("nav.students")}>
          <div className="grid gap-2 sm:grid-cols-2">
            {r.students.map((s) => (
              <Link key={s.id} href={`/tutor/students/${s.id}`} className="flex items-center gap-3 rounded-xl p-2 hover:bg-ink-50"><Avatar name={s.fullName} hue={s.hue} size={32} /><span><span className="font-medium">{s.fullName}</span><span className="block text-xs text-mute">{s.gradeYear} · {s.familyName}</span></span></Link>
            ))}
          </div>
        </Card>
      )}
      {r.topics.length > 0 && (
        <Card title={t("common.topics")}>
          <ul className="space-y-1 text-sm">
            {r.topics.map((x, i) => (
              <li key={i}><Link href={`/tutor/students/${x.studentId}#curriculum`} className="inline-flex items-center gap-2 hover:underline"><MasteryDot level={x.topic.mastery} />{x.topic.name} <span className="text-mute">· {x.studentName}</span></Link></li>
            ))}
          </ul>
        </Card>
      )}
      {r.homework.length > 0 && <Card title={t("nav.homework")}><div className="divide-y divide-line/70">{r.homework.map((h) => <HomeworkRow key={h.id} h={h} href={`/tutor/homework/${h.id}`} studentName={h.studentName} />)}</div></Card>}
      {r.tests.length > 0 && <Card title={t("nav.tests")}><div className="divide-y divide-line/70">{r.tests.map((a) => <TestRow key={a.id} a={a} href={`/tutor/tests/${a.id}`} studentName={a.studentName} />)}</div></Card>}
      {r.resources.length > 0 && <Card title={t("nav.resources")}><ul className="space-y-1 text-sm">{r.resources.map((x) => <li key={x.id}><a href={x.url ?? "#"} className="hover:underline" target="_blank" rel="noreferrer">{x.title}</a> <span className="text-mute">· {x.type}</span></li>)}</ul></Card>}
    </div>
  );
}
