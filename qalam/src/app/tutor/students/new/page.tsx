import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import * as s from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { t } from "@/lib/i18n";
import { WEEKDAYS } from "@/lib/dates";
import { Card, Field, PageHeader } from "@/components/ui";
import { createStudentAction } from "../../actions";

export const dynamic = "force-dynamic";

export default async function NewStudentPage() {
  const user = await requireUser("tutor");
  const db = getDb();
  const families = await db.query.families.findMany({ where: eq(s.families.tutorId, user.tutorId), orderBy: (f, { asc }) => [asc(f.name)] });
  const templates = await db.query.curriculumTemplates.findMany({ where: eq(s.curriculumTemplates.tutorId, user.tutorId) });
  return (
    <div className="max-w-3xl">
      <PageHeader title={t("tutor.newStudent")} subtitle="Student → family → curriculum → weekly slot → package → invitation codes. Everything here can be changed later." />
      <form action={createStudentAction} className="space-y-5">
        <Card title="Student">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="First name"><input name="firstName" className="input" required /></Field>
            <Field label="Last name"><input name="lastName" className="input" required /></Field>
            <Field label="Preferred name" hint={t("common.optional")}><input name="preferredName" className="input" /></Field>
            <Field label="Grade / year"><input name="gradeYear" className="input" placeholder="Grade 10" /></Field>
            <Field label="School" className="sm:col-span-2"><input name="school" className="input" /></Field>
          </div>
        </Card>
        <Card title="Family & guardian" subtitle="Pick an existing family for siblings, or create a new one.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Existing family" className="sm:col-span-2">
              <select name="familyId" className="input">
                <option value="">— New family —</option>
                {families.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </Field>
            <Field label="New family name" hint="Defaults to “<surname> family”"><input name="familyName" className="input" /></Field>
            <Field label="Guardian full name"><input name="guardianName" className="input" /></Field>
            <Field label="Guardian email"><input name="guardianEmail" type="email" className="input" /></Field>
            <Field label="Guardian phone (WhatsApp)" hint="E.164, e.g. +97455512345"><input name="guardianPhone" className="input" placeholder="+974" /></Field>
          </div>
        </Card>
        <Card title="Curriculum, slot & package">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Curriculum" className="sm:col-span-2">
              <select name="templateId" className="input">
                <option value="">— Choose later —</option>
                {templates.map((tp) => (
                  <option key={tp.id} value={tp.id}>{tp.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Weekly slot day">
              <select name="weekday" className="input" defaultValue="">
                <option value="">— No fixed slot —</option>
                {WEEKDAYS.map((d, i) => (
                  <option key={d} value={i}>{d}</option>
                ))}
              </select>
            </Field>
            <Field label="Start time"><input name="time" type="time" className="input" defaultValue="16:00" /></Field>
            <Field label="Duration (minutes)"><input name="minutes" type="number" className="input" defaultValue={60} min={30} step={15} /></Field>
            <Field label="Mode">
              <select name="mode" className="input">
                <option value="in_person">{t("common.inPerson")}</option>
                <option value="online">{t("common.online")}</option>
              </select>
            </Field>
            <Field label="Package (sessions)" hint="Leave blank for pay-as-you-go"><input name="packageSessions" type="number" className="input" min={1} placeholder="8" /></Field>
          </div>
        </Card>
        <button className="btn-primary" type="submit">Create student & generate invitations</button>
      </form>
    </div>
  );
}
