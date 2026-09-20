/* eslint-disable @typescript-eslint/no-explicit-any */
// Realistic demo data. Everything is relative to "today" so dashboards always
// show live-looking content. Run with `npm run db:seed` (or db:reset).
import fs from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { getDb, runMigrations, type DB } from "./index";
import * as s from "./schema";
import { ALL_TEMPLATES } from "./curricula";
import { addDaysKey, todayKey, weekdayOf, zonedToUtc, isInBlackout } from "@/lib/dates";
import { newId, invitationCode } from "@/lib/ids";
import bcrypt from "bcryptjs";

const PASSWORD = "demo1234";
const TUTOR_ID = "tutor_nabil";

type Lesson = { topics: string[]; mastery?: Record<string, s.Mastery>; summary: string; plan?: string; assessment?: string };

const today = todayKey();
const at = (daysFromToday: number, time: string) => zonedToUtc(addDaysKey(today, daysFromToday), time);
const dayKey = (n: number) => addDaysKey(today, n);

async function pageImage(uploadDir: string, tutorId: string, userId: string, title: string, lines: string[], hue = 220) {
  const sharp = (await import("sharp")).default;
  const ruled = Array.from({ length: 26 }, (_, i) => `<line x1="80" y1="${180 + i * 52}" x2="1160" y2="${180 + i * 52}" stroke="#cfd8e3" stroke-width="2"/>`).join("");
  const text = lines
    .map((l, i) => `<text x="${120 + (i % 3) * 6}" y="${215 + i * 52}" font-family="Comic Sans MS, Segoe Script, cursive" font-size="34" fill="hsl(${hue} 45% 28%)" transform="rotate(-0.6 ${120} ${215 + i * 52})">${l.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</text>`)
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1240" height="1600"><rect width="100%" height="100%" fill="#fbf8f1"/><line x1="140" y1="0" x2="140" y2="1600" stroke="#e8b4b4" stroke-width="3"/>${ruled}<text x="120" y="120" font-family="Comic Sans MS, cursive" font-size="40" fill="hsl(${hue} 45% 28%)">${title}</text>${text}</svg>`;
  const id = newId();
  const key = `${id}.jpg`;
  const buf = await sharp(Buffer.from(svg)).jpeg({ quality: 82 }).toBuffer();
  fs.mkdirSync(uploadDir, { recursive: true });
  fs.writeFileSync(path.join(uploadDir, key), buf);
  return { id, tutorId, storageKey: key, mimeType: "image/jpeg", sizeBytes: buf.length, originalName: `${title}.jpg`, width: 1240, height: 1600, uploadedByUserId: userId };
}

export async function seed(db: DB) {
  const uploadDir = process.env.UPLOAD_DIR ?? "./data/uploads";
  const hash = await bcrypt.hash(PASSWORD, 10);

  // --- Tutor ---------------------------------------------------------------
  await db.insert(s.tutors).values({ id: TUTOR_ID, name: "Nabil", invitePrefix: "NAB", workingHoursStart: "14:00", workingHoursEnd: "22:00" });
  const tutorUserId = newId();
  await db.insert(s.users).values({ id: tutorUserId, tutorId: TUTOR_ID, role: "tutor", email: "nabil@qalam.demo", passwordHash: hash, displayName: "Nabil" });

  // --- Subjects & curricula --------------------------------------------------
  const subjectIds: Record<string, string> = {};
  for (const [name, colour] of [
    ["Mathematics", "teal"],
    ["Physics", "violet"],
  ]) {
    const id = newId();
    subjectIds[name] = id;
    await db.insert(s.subjects).values({ id, tutorId: TUTOR_ID, name, colour });
  }
  // templateKey -> { id, topics: code -> {topicId, sectionId, order} }
  const templates: Record<string, { id: string; topics: Record<string, { topicId: string; sectionId: string; order: number }> }> = {};
  for (const tpl of ALL_TEMPLATES) {
    const id = newId();
    templates[tpl.key] = { id, topics: {} };
    await db.insert(s.curriculumTemplates).values({ id, tutorId: TUTOR_ID, subjectId: subjectIds[tpl.subject], name: tpl.name, board: tpl.board, level: tpl.level, isDraft: true });
    let order = 0;
    for (const [si, sec] of tpl.sections.entries()) {
      const sectionId = newId();
      await db.insert(s.curriculumSections).values({ id: sectionId, templateId: id, code: sec.code, name: sec.name, sortOrder: si });
      for (const [code, name] of sec.topics) {
        const topicId = newId();
        await db.insert(s.curriculumTopics).values({ id: topicId, sectionId, code, name, sortOrder: order });
        templates[tpl.key].topics[code] = { topicId, sectionId, order: order++ };
      }
    }
  }

  // --- Families, guardians, students -----------------------------------------
  async function family(name: string, guardiansIn: { name: string; email: string; phone: string; rel: string; login?: boolean }[]) {
    const familyId = newId();
    await db.insert(s.families).values({ id: familyId, tutorId: TUTOR_ID, name, validUntil: dayKey(120) });
    const gids: string[] = [];
    for (const g of guardiansIn) {
      let userId: string | null = null;
      if (g.login !== false) {
        userId = newId();
        await db.insert(s.users).values({ id: userId, tutorId: TUTOR_ID, role: "guardian", email: g.email, passwordHash: hash, displayName: g.name.split(" ")[0] });
      }
      const gid = newId();
      await db.insert(s.guardians).values({ id: gid, tutorId: TUTOR_ID, userId, fullName: g.name, email: g.email, phone: g.phone, relationship: g.rel });
      await db.insert(s.familyGuardians).values({ familyId, guardianId: gid });
      gids.push(gid);
    }
    return { familyId, gids };
  }

  const cooper = await family("Cooper family", [{ name: "Sarah Cooper", email: "sarah.cooper@example.com", phone: "+97455512001", rel: "Mother" }]);
  const nguyen = await family("Nguyen family", [{ name: "Linh Nguyen", email: "linh.nguyen@example.com", phone: "+97455512002", rel: "Mother" }]);
  const mehta = await family("Mehta family", [{ name: "Priya Mehta", email: "priya.mehta@example.com", phone: "+97455512003", rel: "Mother" }]);
  const kuwari = await family("Al-Kuwari family", [
    { name: "Ahmed Al-Kuwari", email: "ahmed@qalam.demo", phone: "+97455512004", rel: "Father" },
    { name: "Noora Al-Kuwari", email: "noora.alkuwari@example.com", phone: "+97455512005", rel: "Mother", login: false },
  ]);

  type StudentSpec = {
    first: string; last: string; preferred?: string; familyId: string; school: string; grade: string; hue: number; start: number;
    username?: string; login?: boolean; notes?: string; important?: string; templates: string[]; current?: string;
    schedule: { weekday: number; time: string; minutes?: number; mode?: "in_person" | "online"; location?: string; link?: string }[];
  };
  const studentIds: Record<string, string> = {};
  const studentUserIds: Record<string, string> = {};
  const enrolmentOf: Record<string, Record<string, { enrolmentId: string; et: Record<string, string> }>> = {}; // student -> tplKey -> code -> enrolmentTopicId

  async function student(sp: StudentSpec) {
    const id = newId();
    studentIds[sp.first] = id;
    let userId: string | null = null;
    if (sp.login !== false) {
      userId = newId();
      studentUserIds[sp.first] = userId;
      await db.insert(s.users).values({ id: userId, tutorId: TUTOR_ID, role: "student", username: sp.username ?? sp.first.toLowerCase(), passwordHash: hash, displayName: sp.preferred ?? sp.first });
    }
    await db.insert(s.students).values({
      id, tutorId: TUTOR_ID, familyId: sp.familyId, userId, firstName: sp.first, lastName: sp.last, preferredName: sp.preferred ?? null, school: sp.school,
      gradeYear: sp.grade, avatarHue: sp.hue, startDate: dayKey(-sp.start), academicNotes: sp.notes ?? null, importantNote: sp.important ?? null,
    });
    enrolmentOf[sp.first] = {};
    for (const key of sp.templates) {
      const enrolmentId = newId();
      await db.insert(s.enrolments).values({ id: enrolmentId, studentId: id, templateId: templates[key].id, startedAt: dayKey(-sp.start) });
      const et: Record<string, string> = {};
      for (const [code, t] of Object.entries(templates[key].topics)) {
        const etId = newId();
        et[code] = etId;
        await db.insert(s.enrolmentTopics).values({ id: etId, enrolmentId, topicId: t.topicId, sectionId: t.sectionId, sortOrder: t.order, isCurrent: sp.current === `${key}:${code}` });
      }
      enrolmentOf[sp.first][key] = { enrolmentId, et };
    }
    for (const sc of sp.schedule) {
      await db.insert(s.schedules).values({
        id: newId(), tutorId: TUTOR_ID, studentId: id, weekday: sc.weekday, startTime: sc.time, durationMinutes: sc.minutes ?? 60,
        mode: sc.mode ?? "in_person", location: sc.location ?? (sc.mode === "online" ? null : "Student's home"), meetingLink: sc.link ?? null,
      });
    }
    return id;
  }

  await student({
    first: "Daniel", last: "Cooper", familyId: cooper.familyId, school: "Doha College", grade: "Grade 11 (IB DP1)", hue: 215, start: 120, username: "daniel",
    templates: ["ib-maths-ai"], current: "ib-maths-ai:2.4",
    notes: "Bright but rushes. Slow him down on financial maths — he loses marks on rounding and on reading the question.",
    important: "Bring your GDC to every session and to the Functions test — we will practise the graph menu.",
    schedule: [{ weekday: 1, time: "16:30" }, { weekday: 3, time: "16:30" }],
  });
  await student({
    first: "Chris", last: "Nguyen", familyId: nguyen.familyId, school: "American School of Doha", grade: "Grade 8", hue: 28, start: 60, username: "chris",
    templates: ["school-g8-9"], current: "school-g8-9:T1.3",
    notes: "Needs the 'why' before the 'how'. Responds well to visual explanations.",
    important: "Great effort on the indices worksheet — I'm reviewing it now.",
    schedule: [{ weekday: 2, time: "17:00" }, { weekday: 4, time: "17:00" }],
  });
  await student({
    first: "Aarnav", last: "Mehta", familyId: mehta.familyId, school: "Qatar Academy Doha", grade: "Grade 11 (IB DP1)", hue: 280, start: 9, login: false,
    templates: ["ib-maths-aa-hl"], current: "ib-maths-aa-hl:2.1",
    notes: "New. Diagnostic part 1 done (number & algebra). Strong algebraic fluency, unsure on proof.",
    schedule: [{ weekday: 6, time: "10:00", minutes: 90, mode: "online", link: "https://meet.google.com/qalam-aarnav" }],
  });
  await student({
    first: "Mohammed", last: "Al-Kuwari", familyId: kuwari.familyId, school: "Newton British Academy", grade: "Grade 10", hue: 160, start: 200, username: "mohammed",
    templates: ["igcse-maths-a"], current: "igcse-maths-a:2.2b",
    notes: "Needs extra support. Gaps in fractions and negative numbers surface in every algebra topic — keep looping back. Confidence is the real issue.",
    important: "You got every expansion right last session. Factorising is the same thing backwards — you can do this.",
    schedule: [{ weekday: 0, time: "18:00" }, { weekday: 2, time: "18:00" }],
  });
  await student({
    first: "Maryam", last: "Al-Kuwari", familyId: kuwari.familyId, school: "Newton British Academy", grade: "Grade 11", hue: 330, start: 200, username: "maryam",
    templates: ["igcse-maths-a", "igcse-physics"], current: "igcse-maths-a:3.4a",
    notes: "Very organised. Aiming for a 9. Physics is the weaker subject — mostly maths-in-physics issues (rearranging).",
    schedule: [{ weekday: 1, time: "18:00" }, { weekday: 3, time: "18:00" }],
  });
  await student({
    first: "Muhanna", last: "Al-Kuwari", familyId: kuwari.familyId, school: "Newton British Academy", grade: "Grade 8", hue: 45, start: 90, username: "muhanna",
    templates: ["school-g8-9"], current: "school-g8-9:T1.2",
    notes: "Youngest of the three. Short attention span — 40 min of content then a game.",
    important: "Fractions challenge: beat your score of 14/20 this week?",
    schedule: [{ weekday: 4, time: "16:00", minutes: 45 }],
  });

  // --- Blackout dates ---------------------------------------------------------
  const blackouts = [{ startDate: "2026-10-18", endDate: "2026-10-22", reason: "Autumn mid-term break" }];
  for (const b of blackouts) await db.insert(s.blackoutDates).values({ id: newId(), tutorId: TUTOR_ID, ...b });

  // --- Packages -------------------------------------------------------------
  const pkg: Record<string, string> = {};
  const addPkg = async (key: string, familyId: string, studentId: string | null, total: number, started: number, active = true, amount?: number) => {
    const id = newId();
    pkg[key] = id;
    await db.insert(s.packages).values({ id, tutorId: TUTOR_ID, familyId, studentId, totalSessions: total, startedAt: dayKey(-started), paymentStatus: "paid", amountQar: amount ?? null, active });
  };
  await addPkg("daniel_old", cooper.familyId, studentIds.Daniel, 8, 70, false, 2400);
  await addPkg("daniel", cooper.familyId, studentIds.Daniel, 8, 28, true, 2400);
  await addPkg("chris", nguyen.familyId, studentIds.Chris, 14, 40, true, 3500);
  await addPkg("aarnav", mehta.familyId, studentIds.Aarnav, 8, 8, true, 3200);
  await addPkg("kuwari", kuwari.familyId, null, 30, 35, true, 8000);

  // --- Sessions from schedules + storylines --------------------------------
  const schedules = await db.select().from(s.schedules);
  const sessionsByStudent: Record<string, string[]> = {};

  const storylines: Record<string, Lesson[]> = {
    Daniel: [
      { topics: ["1.2"], mastery: { "1.2": "strong" }, summary: "Arithmetic sequences — nth term and sum. Confident.", plan: "Geometric sequences next." },
      { topics: ["1.3"], mastery: { "1.3": "comfortable" }, summary: "Geometric sequences and sum to infinity. Solid; one slip on common ratio sign.", plan: "Start financial maths." },
      { topics: ["1.4"], mastery: { "1.4": "needs_work" }, summary: "Compound interest and annuities on the GDC. Rounding and reading the question cost marks.", plan: "Redo the annuity questions with the TVM solver.", assessment: "Rushed. Knew the method, lost marks on set-up." },
      { topics: ["1.4", "2.1"], mastery: { "1.4": "needs_work", "2.1": "strong" }, summary: "Finance TVM solver practice, then straight lines (gradient, intercept, parallel/perpendicular).", plan: "Functions: domain/range." },
      { topics: ["2.2", "2.3"], mastery: { "2.2": "comfortable", "2.3": "developing" }, summary: "Domain, range and key features of graphs. Good, but reading asymptotes from the GDC needs practice.", plan: "Linear models and modelling questions." },
      { topics: ["2.3", "2.4"], mastery: { "2.3": "developing", "2.4": "needs_work" }, summary: "Linear models in context. Struggled to interpret the gradient in words — this is a test favourite.", plan: "Revise linear models; begin quadratic/exponential models.", assessment: "Method fine; interpretation vague. Needs sentence frames." },
    ],
    Chris: [
      { topics: ["T1.1"], mastery: { "T1.1": "strong" }, summary: "Rounding and estimation. Excellent.", plan: "Fractions, decimals, percentages." },
      { topics: ["T1.2"], mastery: { "T1.2": "developing" }, summary: "Fractions: adding with different denominators. Mixed numbers still shaky.", plan: "Fractions corrections then indices." },
      { topics: ["T1.2"], mastery: { "T1.2": "comfortable" }, summary: "Fraction corrections — much better. Started laws of indices with the 'why'.", plan: "Multiplication and division laws." },
      { topics: ["T1.3"], mastery: { "T1.3": "developing" }, summary: "Law of Indices: multiplying and dividing powers. Good understanding; watch the power of a power.", plan: "Power of a power, zero and negative indices." },
    ],
    Aarnav: [{ topics: ["1.1", "1.2"], mastery: { "1.1": "comfortable", "1.2": "comfortable" }, summary: "Diagnostic part 1: sequences and logarithms. Strong algebra; proof untested yet.", plan: "Diagnostic part 2: functions and trigonometry.", assessment: "Diagnostic. Fast and accurate on routine work." }],
    Mohammed: [
      { topics: ["1.2"], mastery: { "1.2": "needs_work" }, summary: "Fractions review. Mixed numbers and dividing fractions need more practice.", plan: "Negative numbers and BIDMAS." },
      { topics: ["1.1", "2.1"], mastery: { "1.1": "developing", "2.1": "developing" }, summary: "Negative numbers then simplifying expressions. Got there with support.", plan: "Expanding brackets." },
      { topics: ["2.2a"], mastery: { "2.2a": "developing" }, summary: "Expanding single and double brackets. Good progress once we slowed down.", plan: "More double brackets, then factorising.", assessment: "Confidence improving." },
      { topics: ["2.2a"], mastery: { "2.2a": "comfortable" }, summary: "Double brackets — every question right. Introduced factorising.", plan: "Factorising single brackets; keep the negative-numbers warm-up." },
      { topics: ["2.2b"], mastery: { "2.2b": "needs_work" }, summary: "Factorising. Finds the common factor but loses the second bracket term.", plan: "Factorising practice — small steps.", assessment: "Frustrated by the end. Keep sessions positive." },
      { topics: ["2.2b"], mastery: { "2.2b": "needs_work" }, summary: "Factorising again with a 'reverse the expansion' approach. Better but not yet secure.", plan: "One more factorising session, then quadratics." },
    ],
    Maryam: [
      { topics: ["4.8a", "4.8b"], mastery: { "4.8a": "strong", "4.8b": "strong" }, summary: "Pythagoras and SOHCAHTOA revision. Very secure.", plan: "Sine and cosine rules." },
      { topics: ["4.8c"], mastery: { "4.8c": "developing" }, summary: "Sine rule (incl. ambiguous case) and cosine rule. Chooses the right rule; occasionally mislabels sides.", plan: "Cosine rule and area of a triangle.", assessment: "Careful. Needs speed." },
      { topics: ["4.8c", "4.8d"], mastery: { "4.8c": "comfortable", "4.8d": "developing" }, summary: "Mixed trig problems and 3D trigonometry (diagonals of a cuboid).", plan: "Test prep: past-paper trig questions." },
      { topics: ["4.8c", "4.8d"], mastery: { "4.8c": "comfortable", "4.8d": "comfortable" }, summary: "Past-paper trigonometry under time. Ready for the test.", plan: "After the test: differentiation." },
      { topics: ["3.4a"], mastery: { "3.4a": "developing" }, summary: "Test corrections (cosine rule sign error) then started differentiation.", plan: "Gradients and turning points." },
      { topics: ["3.4a"], mastery: { "3.4a": "comfortable" }, summary: "Differentiating polynomials — fast and accurate.", plan: "Turning points and kinematics." },
    ],
    Muhanna: [
      { topics: ["T1.1"], mastery: { "T1.1": "comfortable" }, summary: "Rounding to significant figures with a quiz at the end.", plan: "Fractions." },
      { topics: ["T1.2"], mastery: { "T1.2": "developing" }, summary: "Fractions of amounts and equivalent fractions. Good energy today.", plan: "Adding fractions." },
      { topics: ["T1.2"], mastery: { "T1.2": "developing" }, summary: "Adding and subtracting fractions. Common denominators are clicking.", plan: "Fractions challenge — beat 14/20." },
    ],
  };
  const templateOfStudent: Record<string, string> = { Daniel: "ib-maths-ai", Chris: "school-g8-9", Aarnav: "ib-maths-aa-hl", Mohammed: "igcse-maths-a", Maryam: "igcse-maths-a", Muhanna: "school-g8-9" };
  const packageOfStudent: Record<string, string> = { Daniel: pkg.daniel, Chris: pkg.chris, Aarnav: pkg.aarnav, Mohammed: pkg.kuwari, Maryam: pkg.kuwari, Muhanna: pkg.kuwari };
  const startOfStudent: Record<string, number> = { Daniel: 28, Chris: 35, Aarnav: 9, Mohammed: 35, Maryam: 35, Muhanna: 35 };

  const insertSession = async (
    name: string, startsAt: Date, minutes: number, status: s.SessionStatus, extra: Partial<typeof s.sessions.$inferInsert> & { scheduleId: string; mode: "in_person" | "online"; location: string | null; meetingLink: string | null },
    lesson?: Lesson,
  ) => {
    const id = newId();
    await db.insert(s.sessions).values({
      id, tutorId: TUTOR_ID, startsAt, durationMinutes: minutes, status, packageId: packageOfStudent[name], ...extra,
      sharedSummary: lesson?.summary ?? extra.sharedSummary ?? null, planForNext: lesson?.plan ?? null,
      loggedAt: lesson ? new Date(startsAt.getTime() + minutes * 60000 + 15 * 60000) : null,
    });
    await db.insert(s.sessionStudents).values({ sessionId: id, studentId: studentIds[name], attended: status === "completed" ? true : status === "no_show" ? false : null, assessment: lesson?.assessment ?? null });
    if (lesson) {
      const tplKey = templateOfStudent[name];
      const et = enrolmentOf[name][tplKey].et;
      for (const code of lesson.topics) {
        const level = lesson.mastery?.[code] ?? null;
        await db.insert(s.sessionTopics).values({ id: newId(), sessionId: id, studentId: studentIds[name], enrolmentTopicId: et[code], masteryLevel: level });
        if (level) {
          await db.insert(s.topicMasteryHistory).values({ id: newId(), studentId: studentIds[name], enrolmentTopicId: et[code], level, source: "session", sourceId: id, recordedAt: startsAt });
          await db
            .insert(s.topicMastery)
            .values({ id: newId(), studentId: studentIds[name], enrolmentTopicId: et[code], level, source: "session", sourceId: id, updatedAt: startsAt })
            .onConflictDoUpdate({ target: [s.topicMastery.studentId, s.topicMastery.enrolmentTopicId], set: { level, source: "session", sourceId: id, updatedAt: startsAt } });
        }
      }
    }
    (sessionsByStudent[name] ??= []).push(id);
    return id;
  };

  for (const name of Object.keys(storylines)) {
    const scs = schedules.filter((sc) => sc.studentId === studentIds[name]);
    const lessons = [...storylines[name]];
    // Past slots in chronological order.
    const past: { key: string; sc: (typeof scs)[number]; daysAgo: number }[] = [];
    for (let d = -startOfStudent[name]; d < 0; d++) {
      const key = dayKey(d);
      for (const sc of scs) if (weekdayOf(key) === sc.weekday && !isInBlackout(key, blackouts)) past.push({ key, sc, daysAgo: -d });
    }
    const special = (p: (typeof past)[number]): "no_show" | "cancelled" | "unlogged" | null => {
      if (name === "Daniel" && weekdayOf(p.key) === 3 && p.daysAgo >= 10 && p.daysAgo <= 16) return "no_show";
      if (name === "Muhanna" && p.daysAgo >= 1 && p.daysAgo <= 7) return "cancelled";
      if ((name === "Mohammed" || name === "Aarnav") && p.daysAgo <= 2) return "unlogged";
      return null;
    };
    const completedSlots = past.filter((p) => !special(p));
    const firstLessonIndex = Math.max(0, completedSlots.length - lessons.length);
    let completedIdx = 0;
    for (const p of past) {
      const { key, sc } = p;
      const startsAt = zonedToUtc(key, sc.startTime);
      // Daniel's earlier sessions belonged to a previous (exhausted) package.
      const base = { scheduleId: sc.id, mode: sc.mode, location: sc.location, meetingLink: sc.meetingLink, packageId: name === "Daniel" && p.daysAgo > 21 ? pkg.daniel_old : packageOfStudent[name] };
      const kind = special(p);
      if (kind === "no_show") {
        await insertSession(name, startsAt, sc.durationMinutes, "no_show", { ...base, privateNotes: "Family forgot — school trip. Counted against the package per policy; Sarah agreed." });
        continue;
      }
      if (kind === "cancelled") {
        await insertSession(name, startsAt, sc.durationMinutes, "cancelled_by_family", { ...base, cancelledAt: new Date(startsAt.getTime() - 3 * 86400000), privateNotes: "Dentist appointment — cancelled 3 days ahead, not counted." });
        continue;
      }
      if (kind === "unlogged") {
        // Time has passed but nothing is logged yet: this is the "draft log" the dashboard surfaces.
        await insertSession(name, startsAt, sc.durationMinutes, "scheduled", base);
        continue;
      }
      const lesson = completedIdx >= firstLessonIndex ? lessons.shift() : undefined;
      completedIdx++;
      await insertSession(name, startsAt, sc.durationMinutes, "completed", base, lesson ?? { topics: [], summary: "Practice and consolidation session." });
    }
    // Future slots for 6 weeks (skipping blackout dates).
    for (let d = 0; d < 42; d++) {
      const key = dayKey(d);
      for (const sc of scs) {
        if (weekdayOf(key) !== sc.weekday || isInBlackout(key, blackouts)) continue;
        await insertSession(name, zonedToUtc(key, sc.startTime), sc.durationMinutes, "scheduled", { scheduleId: sc.id, mode: sc.mode, location: sc.location, meetingLink: sc.meetingLink });
      }
    }
  }

  // --- Homework -------------------------------------------------------------
  const hw: Record<string, string> = {};
  const addHw = async (key: string, name: string, v: Partial<typeof s.homework.$inferInsert> & { title: string; dueAt: Date; assignedAt: Date; topics?: string[] }) => {
    const id = newId();
    hw[key] = id;
    const { topics, ...rest } = v;
    await db.insert(s.homework).values({ id, tutorId: TUTOR_ID, studentId: studentIds[name], type: "worksheet", ...rest });
    const et = enrolmentOf[name][templateOfStudent[name]].et;
    for (const c of topics ?? []) await db.insert(s.homeworkTopics).values({ homeworkId: id, enrolmentTopicId: et[c] });
    return id;
  };
  await addHw("d1", "Daniel", { title: "Functions past-paper questions (Paper 1 Q3, Q6, Q8)", type: "past paper", instructions: "Full working on paper. Time yourself: 25 minutes.", assignedAt: at(-9, "17:30"), dueAt: at(-5, "20:00"), status: "completed", score: "7/10", completedAt: at(-4, "21:00"), estimatedMinutes: 25, topics: ["2.2", "2.3"] });
  await addHw("d2", "Daniel", { title: "Linear models worksheet", type: "worksheet", instructions: "Q1–Q8. For each gradient, write one sentence interpreting it in context.", assignedAt: at(-2, "17:30"), dueAt: at(3, "20:00"), status: "assigned", priority: "high", estimatedMinutes: 40, topics: ["2.4"] });
  await addHw("d3", "Daniel", { title: "Financial maths: TVM solver drill", type: "revision", instructions: "Redo the five annuity questions from the session. Show the TVM inputs.", assignedAt: at(-16, "17:30"), dueAt: at(-12, "20:00"), status: "completed", score: "Good — 4/5", completedAt: at(-11, "19:00"), topics: ["1.4"] });
  await addHw("c1", "Chris", { title: "Laws of indices worksheet", type: "worksheet", instructions: "Q1–Q20. Write the rule you used next to each answer.", assignedAt: at(-5, "18:00"), dueAt: at(-1, "20:00"), status: "submitted", estimatedMinutes: 30, topics: ["T1.3"] });
  await addHw("c2", "Chris", { title: "Fractions corrections", type: "corrections", instructions: "Correct Q4, Q7 and Q9 from the fractions test. Show every step.", assignedAt: at(-12, "18:00"), dueAt: at(-8, "20:00"), status: "corrections_requested", topics: ["T1.2"] });
  await addHw("c3", "Chris", { title: "Rounding and estimation", type: "worksheet", assignedAt: at(-19, "18:00"), dueAt: at(-15, "20:00"), status: "completed", score: "10/10", completedAt: at(-15, "19:00"), topics: ["T1.1"] });
  await addHw("m1", "Mohammed", { title: "Factorising single brackets", type: "worksheet", instructions: "Q1–Q12. Check each answer by expanding it back.", assignedAt: at(-6, "19:00"), dueAt: at(-2, "20:00"), status: "assigned", priority: "high", topics: ["2.2b"] });
  await addHw("m2", "Mohammed", { title: "Expanding double brackets", type: "worksheet", assignedAt: at(-13, "19:00"), dueAt: at(-9, "20:00"), status: "completed", score: "8/10", completedAt: at(-9, "19:30"), topics: ["2.2a"] });
  await addHw("m3", "Mohammed", { title: "Negative numbers warm-up", type: "worksheet", assignedAt: at(-20, "19:00"), dueAt: at(-16, "20:00"), status: "completed", score: "6/10", completedAt: at(-14, "19:30"), topics: ["1.1"] });
  await addHw("m4", "Mohammed", { title: "Fractions: mixed numbers", type: "worksheet", assignedAt: at(-27, "19:00"), dueAt: at(-23, "20:00"), status: "completed", score: "5/10", completedAt: at(-22, "19:30"), topics: ["1.2"] });
  await addHw("y1", "Maryam", { title: "Differentiation: gradients at a point", type: "textbook questions", instructions: "Ex 16B Q1–Q10.", assignedAt: at(-1, "19:00"), dueAt: at(5, "20:00"), status: "assigned", topics: ["3.4a"] });
  await addHw("y2", "Maryam", { title: "Trigonometry past paper (mixed)", type: "past paper", assignedAt: at(-20, "19:00"), dueAt: at(-16, "20:00"), status: "completed", score: "18/20", completedAt: at(-16, "19:00"), topics: ["4.8c"] });
  await addHw("h1", "Muhanna", { title: "Fractions challenge (20 questions)", type: "challenge", instructions: "Beat 14/20. No calculator.", assignedAt: at(-4, "17:00"), dueAt: at(2, "20:00"), status: "in_progress", topics: ["T1.2"] });

  // Submissions with page images and feedback.
  const chrisSub = newId();
  const chrisPages = [
    await pageImage(uploadDir, TUTOR_ID, studentUserIds.Chris, "Laws of indices — Q1–10", ["1) 2^3 × 2^4 = 2^7 = 128   (add the powers)", "2) 5^6 ÷ 5^2 = 5^4 = 625   (subtract)", "3) (3^2)^3 = 3^6 = 729   (multiply)", "4) 7^0 = 1", "5) x^5 × x^2 = x^7", "6) y^8 ÷ y^3 = y^5", "7) (a^3)^4 = a^12", "8) 2^-2 = 1/4", "9) 10^3 × 10^-1 = 10^2 = 100", "10) (2x^2)^3 = 8x^6"], 28),
    await pageImage(uploadDir, TUTOR_ID, studentUserIds.Chris, "Laws of indices — Q11–20", ["11) 3^4 × 3^-2 = 3^2 = 9", "12) 4^-1 = 1/4", "13) (x^2 y)^3 = x^6 y^3", "14) 5^3 ÷ 5^-1 = 5^4", "15) 2^5 × 2^5 = 2^10", "16) 9^(1/2) = 3", "17) (2^3)^2 ÷ 2^4 = 2^2 = 4", "18) x^3 × x^3 × x^3 = x^9", "19) 6^2 ÷ 6^2 = 6^0 = 1", "20) (3a)^2 = 9a^2"], 28),
  ];
  for (const f of chrisPages) await db.insert(s.files).values(f);
  await db.insert(s.submissions).values({ id: chrisSub, homeworkId: hw.c1, studentId: studentIds.Chris, version: 1, comment: "I wasn't sure about Q14 (dividing by a negative power).", submittedAt: at(-1, "19:20"), outcome: "pending" });
  for (const [i, f] of chrisPages.entries()) await db.insert(s.submissionPages).values({ id: newId(), submissionId: chrisSub, fileId: f.id, pageOrder: i });

  const chrisSub2 = newId();
  const chrisCorrPage = await pageImage(uploadDir, TUTOR_ID, studentUserIds.Chris, "Fractions corrections", ["Q4) 2/3 + 1/4 = 8/12 + 3/12 = 11/12", "Q7) 1 1/2 ÷ 3/4 = 3/2 × 4/3 = 12/6 = 2", "Q9) 3/5 of 45 = 45 ÷ 5 × 3 = 27", "", "(I think Q7 is right now?)"], 28);
  await db.insert(s.files).values(chrisCorrPage);
  await db.insert(s.submissions).values({ id: chrisSub2, homeworkId: hw.c2, studentId: studentIds.Chris, version: 1, submittedAt: at(-8, "18:40"), reviewedAt: at(-7, "21:00"), outcome: "corrections_requested" });
  const corrPageId = newId();
  await db.insert(s.submissionPages).values({ id: corrPageId, submissionId: chrisSub2, fileId: chrisCorrPage.id, pageOrder: 0 });
  await db.insert(s.feedback).values([
    { id: newId(), tutorId: TUTOR_ID, studentId: studentIds.Chris, targetType: "submission", targetId: chrisSub2, submissionPageId: corrPageId, authorUserId: tutorUserId, body: "Q4 and Q9 are perfect. Q7: you flipped the wrong fraction — flip the second one (the divisor). Try it once more.", visibility: "student", createdAt: at(-7, "21:00") },
    { id: newId(), tutorId: TUTOR_ID, studentId: studentIds.Chris, targetType: "homework", targetId: hw.c2, authorUserId: tutorUserId, body: "Chris redid the fractions questions carefully — two of three are now correct. One more attempt on dividing fractions and we move on.", visibility: "family", createdAt: at(-7, "21:05") },
  ]);

  const danielSub = newId();
  const danielPage = await pageImage(uploadDir, TUTOR_ID, studentUserIds.Daniel, "Functions P1 — Q3, Q6, Q8", ["Q3 a) domain x ≥ -2   b) range f(x) ≥ 0", "Q6 a) f(g(x)) = 2(x+1)^2 - 3", "    b) f^-1(x) = (x + 3)/2", "Q8 a) vertical asymptote x = 1", "    b) horizontal asymptote y = 2  ✓", "    c) y-intercept (0, -1)"], 215);
  await db.insert(s.files).values(danielPage);
  await db.insert(s.submissions).values({ id: danielSub, homeworkId: hw.d1, studentId: studentIds.Daniel, version: 1, submittedAt: at(-5, "19:00"), reviewedAt: at(-4, "21:00"), outcome: "approved" });
  await db.insert(s.submissionPages).values({ id: newId(), submissionId: danielSub, fileId: danielPage.id, pageOrder: 0 });
  await db.insert(s.feedback).values([
    { id: newId(), tutorId: TUTOR_ID, studentId: studentIds.Daniel, targetType: "submission", targetId: danielSub, authorUserId: tutorUserId, body: "7/10. Q6(b) inverse is right; Q8(c) intercept sign error — you read f(0) from the graph instead of substituting. Good structure throughout.", visibility: "student", createdAt: at(-4, "21:00") },
    { id: newId(), tutorId: TUTOR_ID, studentId: studentIds.Daniel, targetType: "general", authorUserId: tutorUserId, body: "Daniel is working consistently. Functions are nearly test-ready; the Functions test on the 22nd will hinge on interpreting linear models in words, which we are drilling now.", visibility: "family", important: true, createdAt: at(-2, "21:10") },
    { id: newId(), tutorId: TUTOR_ID, studentId: studentIds.Daniel, targetType: "general", authorUserId: tutorUserId, body: "Sarah mentioned Daniel is anxious about the test — keep feedback encouraging.", visibility: "private", createdAt: at(-2, "21:12") },
  ]);
  await db.insert(s.feedback).values([
    { id: newId(), tutorId: TUTOR_ID, studentId: studentIds.Mohammed, targetType: "general", authorUserId: tutorUserId, body: "Mohammed's expanding brackets is now secure — a real step forward. Factorising is the current focus; homework completion has dipped, so a nudge at home would help.", visibility: "family", important: true, createdAt: at(-3, "20:30") },
    { id: newId(), tutorId: TUTOR_ID, studentId: studentIds.Maryam, targetType: "general", authorUserId: tutorUserId, body: "Maryam's trigonometry test result (78%) reflects strong preparation. We have corrected the cosine-rule slip and moved on to differentiation.", visibility: "family", createdAt: at(-6, "20:00") },
    { id: newId(), tutorId: TUTOR_ID, studentId: studentIds.Muhanna, targetType: "general", authorUserId: tutorUserId, body: "Muhanna is enjoying the fractions challenges and his accuracy is climbing. Short, playful sessions are working.", visibility: "family", createdAt: at(-4, "18:00") },
  ]);

  // --- Assessments (school tests) & revision ------------------------------
  const danielTest = newId();
  await db.insert(s.assessments).values({ id: danielTest, tutorId: TUTOR_ID, studentId: studentIds.Daniel, subjectId: subjectIds.Mathematics, name: "Functions Test", date: dayKey(8), priority: "high", notes: "Topic 2 (Functions): domain/range, graphs, linear and exponential models. GDC allowed." });
  {
    const et = enrolmentOf.Daniel["ib-maths-ai"].et;
    await db.insert(s.assessmentTopics).values([
      { assessmentId: danielTest, enrolmentTopicId: et["2.1"], revisionStatus: null },
      { assessmentId: danielTest, enrolmentTopicId: et["2.2"], revisionStatus: "revised" },
      { assessmentId: danielTest, enrolmentTopicId: et["2.3"], revisionStatus: null },
      { assessmentId: danielTest, enrolmentTopicId: et["2.4"], revisionStatus: null },
      { assessmentId: danielTest, enrolmentTopicId: et["2.5"], revisionStatus: null },
    ]);
  }
  const maryamTest = newId();
  await db.insert(s.assessments).values({ id: maryamTest, tutorId: TUTOR_ID, studentId: studentIds.Maryam, subjectId: subjectIds.Mathematics, name: "Trigonometry Test", date: dayKey(-9), priority: "normal" });
  {
    const et = enrolmentOf.Maryam["igcse-maths-a"].et;
    await db.insert(s.assessmentTopics).values([
      { assessmentId: maryamTest, enrolmentTopicId: et["4.8a"], revisionStatus: "revised" },
      { assessmentId: maryamTest, enrolmentTopicId: et["4.8b"], revisionStatus: "revised" },
      { assessmentId: maryamTest, enrolmentTopicId: et["4.8c"], revisionStatus: "revised", wentWrong: true },
      { assessmentId: maryamTest, enrolmentTopicId: et["4.8d"], revisionStatus: "revised" },
    ]);
    await db.insert(s.assessmentResults).values({ id: newId(), assessmentId: maryamTest, result: "78% (Grade 8)", reflection: "Lost 6 marks on one cosine-rule question (sign error) and 4 on a 3D question she ran out of time for. Everything else correct.", sharedComment: "A strong result. One slip on the cosine rule — corrected together the following session.", recordedAt: at(-6, "19:30") });
  }
  const mohammedTest = newId();
  await db.insert(s.assessments).values({ id: mohammedTest, tutorId: TUTOR_ID, studentId: studentIds.Mohammed, subjectId: subjectIds.Mathematics, name: "Algebra Unit Test", date: dayKey(19), priority: "high", notes: "Expanding, factorising, linear equations." });
  {
    const et = enrolmentOf.Mohammed["igcse-maths-a"].et;
    await db.insert(s.assessmentTopics).values([
      { assessmentId: mohammedTest, enrolmentTopicId: et["2.1"] },
      { assessmentId: mohammedTest, enrolmentTopicId: et["2.2a"] },
      { assessmentId: mohammedTest, enrolmentTopicId: et["2.2b"] },
      { assessmentId: mohammedTest, enrolmentTopicId: et["2.4"] },
    ]);
  }
  const maryamPhysics = newId();
  await db.insert(s.assessments).values({ id: maryamPhysics, tutorId: TUTOR_ID, studentId: studentIds.Maryam, subjectId: subjectIds.Physics, name: "Physics: Forces and Motion", date: dayKey(24), priority: "normal" });
  {
    const et = enrolmentOf.Maryam["igcse-physics"].et;
    await db.insert(s.assessmentTopics).values([{ assessmentId: maryamPhysics, enrolmentTopicId: et["1.2"] }, { assessmentId: maryamPhysics, enrolmentTopicId: et["1.3"] }, { assessmentId: maryamPhysics, enrolmentTopicId: et["1.4"] }]);
    // A little physics mastery so the second enrolment has content.
    for (const [code, level] of [["1.1", "strong"], ["1.2", "comfortable"], ["1.3", "developing"]] as [string, s.Mastery][]) {
      await db.insert(s.topicMastery).values({ id: newId(), studentId: studentIds.Maryam, enrolmentTopicId: et[code], level, source: "manual", updatedAt: at(-10, "19:00") });
      await db.insert(s.topicMasteryHistory).values({ id: newId(), studentId: studentIds.Maryam, enrolmentTopicId: et[code], level, source: "manual", recordedAt: at(-10, "19:00") });
    }
  }

  // --- Next steps -----------------------------------------------------------
  const steps: [string, string][] = [
    ["Daniel", "Revise linear models: gradient-in-context sentence frames"],
    ["Daniel", "Correct Q8(c) from the functions paper"],
    ["Daniel", "Timed practice on financial maths (TVM solver)"],
    ["Chris", "Power of a power, zero and negative indices"],
    ["Chris", "One more attempt at dividing fractions (Q7)"],
    ["Aarnav", "Diagnostic part 2: functions and trigonometry"],
    ["Aarnav", "Introduce proof by induction with a simple sum"],
    ["Mohammed", "Factorising single brackets — small steps, check by expanding"],
    ["Mohammed", "Negative-numbers warm-up at the start of every session"],
    ["Mohammed", "Begin exam revision for the Algebra Unit Test"],
    ["Maryam", "Turning points and kinematics"],
    ["Maryam", "Physics: rearranging v = u + at and s = ut + ½at²"],
    ["Muhanna", "Fractions challenge — beat 14/20"],
  ];
  for (const [name, text] of steps) await db.insert(s.nextSteps).values({ id: newId(), studentId: studentIds[name], text, source: "session" });
  await db.insert(s.nextSteps).values({ id: newId(), studentId: studentIds.Daniel, text: "Geometric sequences: sum to infinity", source: "session", status: "done", doneAt: at(-20, "18:00") });

  // --- Resources ------------------------------------------------------------
  const res: (typeof s.resources.$inferInsert)[] = [
    { id: newId(), tutorId: TUTOR_ID, subjectId: subjectIds.Mathematics, title: "IB Mathematics AI formula booklet", type: "formula sheet", url: "https://www.ibo.org/", tags: ["IB", "AI", "formula"] },
    { id: newId(), tutorId: TUTOR_ID, studentId: studentIds.Daniel, subjectId: subjectIds.Mathematics, assessmentId: danielTest, title: "Functions revision notes (graphs, domain/range, models)", type: "revision notes", url: "https://example.com/functions-notes", tags: ["functions", "revision"] },
    { id: newId(), tutorId: TUTOR_ID, studentId: studentIds.Daniel, subjectId: subjectIds.Mathematics, title: "TVM solver walkthrough (video)", type: "link", url: "https://example.com/tvm", tags: ["financial maths", "GDC"] },
    { id: newId(), tutorId: TUTOR_ID, studentId: studentIds.Chris, subjectId: subjectIds.Mathematics, title: "Laws of indices — one-page summary", type: "lesson summary", url: "https://example.com/indices", tags: ["indices"] },
    { id: newId(), tutorId: TUTOR_ID, subjectId: subjectIds.Mathematics, title: "Edexcel IGCSE Maths A formula sheet", type: "formula sheet", url: "https://qualifications.pearson.com/", tags: ["IGCSE", "formula"] },
    { id: newId(), tutorId: TUTOR_ID, studentId: studentIds.Mohammed, subjectId: subjectIds.Mathematics, title: "Factorising — worked examples", type: "worksheet", url: "https://example.com/factorising", tags: ["factorising", "algebra"] },
    { id: newId(), tutorId: TUTOR_ID, studentId: studentIds.Maryam, subjectId: subjectIds.Physics, title: "SUVAT equations sheet", type: "formula sheet", url: "https://example.com/suvat", tags: ["physics", "motion"] },
  ];
  await db.insert(s.resources).values(res);

  // --- Invitations ----------------------------------------------------------
  const gid = (fam: { gids: string[] }, i = 0) => fam.gids[i];
  await db.insert(s.invitations).values([
    { id: newId(), tutorId: TUTOR_ID, code: invitationCode("NAB", "Daniel"), role: "student", studentId: studentIds.Daniel, expiresAt: at(-100, "12:00"), usedAt: at(-118, "12:00"), createdAt: at(-120, "12:00") },
    { id: newId(), tutorId: TUTOR_ID, code: invitationCode("NAB", "Ahmed"), role: "guardian", guardianId: gid(kuwari, 0), expiresAt: at(-180, "12:00"), usedAt: at(-198, "12:00"), createdAt: at(-200, "12:00") },
    { id: newId(), tutorId: TUTOR_ID, code: "NAB-AARNAV-DEMO01", role: "student", studentId: studentIds.Aarnav, expiresAt: at(9, "12:00"), createdAt: at(-5, "12:00") },
    { id: newId(), tutorId: TUTOR_ID, code: "NAB-NOORA-DEMO02", role: "guardian", guardianId: gid(kuwari, 1), expiresAt: at(12, "12:00"), createdAt: at(-2, "12:00") },
    { id: newId(), tutorId: TUTOR_ID, code: invitationCode("NAB", "Chris"), role: "student", studentId: studentIds.Chris, expiresAt: at(-40, "12:00"), revokedAt: at(-50, "12:00"), createdAt: at(-55, "12:00") },
  ]);

  // --- Notifications --------------------------------------------------------
  const ahmedUser = (await db.query.users.findFirst({ where: eq(s.users.email, "ahmed@qalam.demo") }))!;
  await db.insert(s.notifications).values([
    { id: newId(), userId: tutorUserId, type: "submission", title: "Chris submitted Laws of indices worksheet", body: "2 pages · 'I wasn't sure about Q14'", link: `/tutor/homework/${hw.c1}`, createdAt: at(-1, "19:20") },
    { id: newId(), userId: tutorUserId, type: "overdue", title: "Mohammed: Factorising single brackets is overdue", link: `/tutor/homework/${hw.m1}`, createdAt: at(-1, "20:01") },
    { id: newId(), userId: tutorUserId, type: "test", title: "Daniel's Functions Test is in 8 days — 3 topics unrevised", link: `/tutor/tests/${danielTest}`, createdAt: at(0, "07:00") },
    { id: newId(), userId: ahmedUser.id, type: "feedback", title: "New feedback about Mohammed", body: "Expanding brackets is now secure.", link: "/parent", createdAt: at(-3, "20:30") },
    { id: newId(), userId: ahmedUser.id, type: "result", title: "Maryam's Trigonometry Test result recorded: 78%", link: "/parent/tests", createdAt: at(-6, "19:30") },
    { id: newId(), userId: studentUserIds.Daniel, type: "homework", title: "New homework: Linear models worksheet", body: "Due in 3 days", link: `/student/homework/${hw.d2}`, createdAt: at(-2, "17:30") },
    { id: newId(), userId: studentUserIds.Daniel, type: "review", title: "Your functions paper has been reviewed: 7/10", link: `/student/homework/${hw.d1}`, createdAt: at(-4, "21:00") },
    { id: newId(), userId: studentUserIds.Chris, type: "corrections", title: "Corrections requested: Fractions corrections", body: "One more try at Q7", link: `/student/homework/${hw.c2}`, createdAt: at(-7, "21:00") },
  ]);

  await db.insert(s.auditLog).values({ id: newId(), tutorId: TUTOR_ID, actorUserId: tutorUserId, action: "seed", entityType: "database", details: { note: "Demo data generated" } });
}

// Allow `npm run db:seed` to run standalone (expects an empty, migrated DB).
if (process.argv[1] && /seed\.ts$/.test(process.argv[1])) {
  (async () => {
    const db = getDb();
    await runMigrations(db);
    await seed(db);
    console.log("Seeded.");
    process.exit(0);
  })().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
