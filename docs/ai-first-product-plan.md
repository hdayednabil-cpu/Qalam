# Qalam: school-specific learning and parent confidence

Decision brief • 18 October 2026 • Proposal, not shipped AI functionality

## Product direction

Qalam should be a subscription learning service that a student can use independently, with parents as the purchasing audience and human tutoring available as an additional service. The core promise is a useful daily plan matched to the student's school, supported by evidence of learning that a parent can understand.

This is a material change from a tutor administration product. Keep the existing tutor workspace as an operations and intervention console. Introduce the student learning engine as a separate module, with its own records and workflow, rather than making AI activity depend on the existence of a booked human lesson. The current preview improvements address responsiveness and presentation; they do not implement this learning engine.

## What the public competitor research establishes

Public official pages were reviewed; authenticated competitor accounts were not tested.

| Product | Verified public capabilities | Implication for Qalam |
| --- | --- | --- |
| Dr Frost | Auto-marked homework, gap tracking, exam-board resources and teacher-created shadow papers; free independent student practice | Similar-looking tests and targeted practice are baseline capabilities. School-specific evidence and the full learning routine must provide additional value. |
| Kognity | Expert-authored curriculum content, automated assessment, immediate feedback and teacher insights; school/district subscriptions, no individual parent/student subscriptions | Content reliability and curriculum structure matter as much as conversation quality. A direct family offer is worth testing. |

Sources: [Dr Frost teachers](https://www.drfrost.org/teachers), [Dr Frost students](https://www.drfrost.org/students), [Kognity overview](https://kognity.com/products/overview/), [Kognity pricing](https://kognity.com/pricing/). We did not establish that either competitor lacks all parent-facing features.

## The learning journey

1. **Build the student profile.** School and campus, year, academic year, subject, syllabus/version, teaching language, textbook, current classroom topics and next exam date. School name alone does not identify a student's curriculum or teacher's assessment style.
2. **Map school evidence.** Samples identify question types, wording, topic mix, difficulty, marks, time, layout and calculator expectations. Preserve where each observation came from. A single test provides a provisional pattern; several papers from different dates are much stronger evidence.
3. **Run a short diagnostic.** Sample prerequisite skills and current-year requirements. Record independent performance, hint usage and uncertainty. A mistake should trigger a focused check before a large remedial assignment.
4. **Build a daily plan.** Blend prerequisite repair, this week's classroom work and spaced review. Adjust the balance when an exam is close. Show the student why today's tasks were chosen and an approximate time commitment.
5. **Teach, then check independence.** Use a hint ladder, worked steps when needed, and a fresh question without help. Keep assisted and independent success separate.
6. **Practise familiar and unfamiliar formats.** Offer school-style mock tests alongside transfer questions presented differently. Familiarity should support confidence without making template recognition the only route to success.
7. **Retest after a delay.** Update mastery from retained understanding, not just one successful attempt. Keep historical evidence when the syllabus changes.
8. **Report to the family.** Explain what changed, the supporting attempts, remaining gaps and next action. Label limited evidence. Avoid unsupported grade predictions.

The example involving Chris is a valuable starting hypothesis. A pilot should test whether improvement persists on fresh questions and later assessments, rather than attributing one strong grade solely to matching the paper format.

## Parent experience

The parent landing page should answer five questions immediately:

- Did my child do the planned work? Distinguish opened, attempted and completed.
- What do they now understand independently? Show a concrete recent example.
- Where are they struggling? Explain the gap in plain language.
- How prepared are they for the next test? Show covered topics and evidence quality.
- What happens next, and do I need to act? Keep interventions specific and calm.

A proposed weekly summary: “Completed 4 of 5 sessions. Solves one-step equations independently; negative signs still cause errors in 3 of 8 recent attempts. Next week: two short repair sessions, followed by a fresh check. Upcoming test: 12 days.” This is an illustrative report, not a finding about an actual student.

Use parent-selected notification frequency. Emphasise useful learning evidence over minutes logged or punitive rankings. Keep each family's access scoped to its own children. Add a visible way to question an explanation or mark; an independent-learning product still needs an accountable escalation route.

## Agents and modular implementation

An agent is a software worker invoked for a defined job. It needs inputs, allowed tools, a budget, an output format and a stopping rule. It does not become an employee or acquire judgement/accountability simply because it has a role name.

| Job | Expected output | Quality control |
| --- | --- | --- |
| Content curator | Extracted samples, curriculum tags, evidence links | Review uncertain scans and ambiguous diagrams |
| Learning planner | A bounded daily plan | Check prerequisites, workload and exam timing |
| Coach | Hints and explanations | Age-appropriate style; preserve mathematical meaning |
| Assessment author | Questions, solutions and mark scheme | Structured outputs; template constraints |
| Independent verifier | Validity and ambiguity checks | Deterministic calculation where suitable; escalation on disagreement |
| Parent reporter | Evidence-backed summary | Every claim traceable to recorded learning events |

Start with one modular application and a background job queue. Separate student identity/access, curriculum, school evidence, assessments, attempts/mastery, reporting, billing/usage and AI-provider adapters. Store structured records in the database; do not make a conversation transcript the only memory of progress. Version question templates, rubrics and syllabus mappings. Shared UI components should handle loading, errors and navigation for new sections such as student comments.

Keep authoring and verification off the page-render path. Show truthful stages such as “Reading your sample”, “Building questions” and “Checking answers”. Jobs should be idempotent, cancellable where feasible, bounded by retry/time/token limits and safe to resume. Enforce spending limits on the server, reserve a task's estimated allowance before starting, and reconcile actual usage afterwards.

Use inexpensive models for routine work and stronger reasoning only where evaluation shows it improves the result. Reuse approved templates, summaries and reference material. Exact-answer grading should use deterministic checks where possible. A verifier is a useful check, not a guarantee: shared model failure modes still require a trusted evaluation set and a review path.

A separate “humanizer” call on every message is unnecessary at the start. Use a shared Qalam voice guide and examples: warm, direct, natural and age-appropriate. Keep the AI identity clear. If a rewrite occurs, it must preserve numbers, conditions and marking rules.

## Preliminary unit economics

These are illustrative API usage estimates, not measured Qalam costs or recommended retail prices. Prices were checked against the [official OpenAI API pricing page](https://developers.openai.com/api/docs/pricing) on 18 October 2026. Candidate models must still pass Qalam-specific accuracy and latency evaluations.

Standard short-context rates in USD per million tokens:

| Model | Input | Output |
| --- | ---: | ---: |
| GPT-6 Luna | 0.10 | 0.50 |
| GPT-6.1 Sol | 2.00 | 10.00 |
| GPT-6 Astra | 10.00 | 50.00 |

For the following calculations, a routine turn uses Luna with 3,000 input and 1,000 billed output tokens ($0.0008). A bounded test pack uses Sol authoring at 8,000/4,000 plus verification at 8,000/2,000 ($0.092). An image job assumes Sol at 4,000/1,000 ($0.018); this is not a fixed per-photo tariff. A difficult escalation uses Astra at 6,000/2,000 ($0.16). A weekly parent report uses Luna at 5,000/800 ($0.0009). Include reasoning in billed output allowances; no cache or batch discount is assumed.

| Monthly scenario | Routine turns | Test packs | Image jobs | Escalations | Model cost | With 30% contingency |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Light | 100 | 2 | 10 | 2 | $0.77 | $1.00 |
| Regular | 400 | 6 | 40 | 8 | $2.88 | $3.74 |
| Intensive | 1,200 | 16 | 120 | 24 | $8.44 | $10.97 |

Each scenario includes four parent reports. Formula: sum of task count × assumed task cost. The contingency is an assumption, not a guarantee. Longer tests, large images, retained conversation context, retries and different model choices can materially increase usage.

Excluded: hosting, database, storage, monitoring, content preparation/licensing, payment fees, tax, customer support, marketing/acquisition, voice/video and paid tool calls. Human support and content work may dominate token costs.

A workable commercial model must calculate:

- Variable cost per student = model use + allocated infrastructure + payment costs + support minutes × support cost per minute + content allocation.
- Contribution per paid student = net subscription receipts − variable cost.
- Break-even paid students = monthly fixed operating costs ÷ positive contribution per student.
- For an extra bundle, minimum price at target contribution margin m = (incremental task cost + support + fixed payment component) ÷ (1 − m − percentage payment fee), provided the denominator is positive. Tax treatment is a separate input.

For example, if a hypothetical subscription nets $20 and total variable cost is $8, contribution is $12; $1,200 of monthly fixed costs then requires 100 paying students before acquisition/reinvestment. These are example inputs, not estimates of Qalam's actual overhead or market price.

Begin with a capped pilot and separate allowances for coaching, verified tests and scan analysis. The “Regular” row is a possible measurement envelope, not an advertised plan. Hard-limit expensive escalation and retries; do not silently bill a family for overruns. Offer clearly described, parent-approved top-ups after measuring cost per successful task. Students should retain access to existing work and basic review when a generation allowance is exhausted.

Before publishing quotas/prices, measure cost at the median and high-usage tail, model error/retry rates, support time, retained subscribers and parent willingness to pay. A single undifferentiated “request” count conceals very different task costs.

## Pilot and acceptance criteria

Start with one subject, a narrow year range and two or three schools where samples are available. Mathematics is a sensible candidate based on the examples provided; the actual pilot cohort remains a user decision.

1. Gather several anonymised sample papers, mark schemes, curriculum documents and current topics per pilot cohort. Record permission/source and remove student identifiers from reusable school-style assets.
2. Build a trusted evaluation set with correct answers, marking expectations, ambiguous examples, scanned handwriting and unfamiliar-format questions.
3. Require questions to pass answer/mark consistency checks; route uncertain extraction or grading to review. Never silently treat an unreadable answer as wrong.
4. Compare diagnostic findings and proposed plans with tutor judgement. Measure retained independent performance and transfer, alongside completion and parent satisfaction.
5. Load-test typical and large rosters; measure click-to-feedback, route latency, generation latency and failures on mobile connections. Proposed UI target: visible acknowledgement within 100 ms after hydration, without delaying fast actions to display animation. This target is not yet measured.
6. Exercise new student/no data, struggling learner, exam tomorrow, parent with two children, duplicate submissions, expired login, failed upload, ambiguous marking, AI timeout, exhausted allowance and tutor escalation.

## Design and responsiveness direction

Keep vivid violet, blue and teal accents, strong typography, layered soft backgrounds, restrained book/geometry line art and consistent spacing. Give navigation, buttons, toggles and menus a short tactile response. Reserve larger celebration for meaningful milestones, never every correct answer. Respect reduced-motion preferences and avoid decorative animation loops while reading or solving.

The current refinement adds real navigation status, route loading placeholders, broad form pending coverage, motion across workspace tabs, lightweight SVG backgrounds, clipboard failure feedback and reduced database waterfalls. No video background, heavy canvas scene or artificial wait is introduced. Browser verification remains blocked by the automation security review; deployed mobile layout and subjective visual quality require screenshots/recordings or a later permitted review.

Useful reference material: 3–5 screenshots and 1–2 short clips, annotated with the specific background, spacing, colours or motion that appeals. Most useful product inputs: first subject/year/schools; school papers and mark schemes; expected pilot size and family budget range; the three questions parents ask most often.
