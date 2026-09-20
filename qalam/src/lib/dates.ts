// All storage is UTC. All rendering goes through these helpers with the tutor's
// timezone (Asia/Qatar by default). Week starts on Sunday; Sunday–Thursday is the
// working week.

export const DEFAULT_TZ = "Asia/Qatar";
export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const fmtCache = new Map<string, Intl.DateTimeFormat>();
function fmt(opts: Intl.DateTimeFormatOptions, tz = DEFAULT_TZ) {
  const key = tz + JSON.stringify(opts);
  let f = fmtCache.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat("en-GB", { timeZone: tz, ...opts });
    fmtCache.set(key, f);
  }
  return f;
}

/** DD/MM/YYYY */
export function formatDate(d: Date | string, tz = DEFAULT_TZ) {
  return fmt({ day: "2-digit", month: "2-digit", year: "numeric" }, tz).format(toDate(d));
}
/** e.g. "Sun 14 Sep" */
export function formatDayShort(d: Date | string, tz = DEFAULT_TZ) {
  return fmt({ weekday: "short", day: "numeric", month: "short" }, tz).format(toDate(d));
}
/** e.g. "Sunday 14 September 2026" */
export function formatDayLong(d: Date | string, tz = DEFAULT_TZ) {
  return fmt({ weekday: "long", day: "numeric", month: "long", year: "numeric" }, tz).format(toDate(d));
}
/** 12-hour time, e.g. "4:30 PM" */
export function formatTime(d: Date | string, tz = DEFAULT_TZ) {
  return fmt({ hour: "numeric", minute: "2-digit", hour12: true }, tz).format(toDate(d)).replace(/\s?(am|pm)/i, (m) => " " + m.trim().toUpperCase());
}
/** 24-hour "HH:MM" for <input type="time"> defaults. */
export function formatTime24(d: Date | string, tz = DEFAULT_TZ) {
  const parts = fmt({ hour: "2-digit", minute: "2-digit", hour12: false }, tz).formatToParts(toDate(d));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return `${get("hour").padStart(2, "0").replace("24", "00")}:${get("minute")}`;
}
export function formatDateTime(d: Date | string, tz = DEFAULT_TZ) {
  return `${formatDayShort(d, tz)} · ${formatTime(d, tz)}`;
}
export function formatMonthYear(d: Date | string, tz = DEFAULT_TZ) {
  return fmt({ month: "long", year: "numeric" }, tz).format(toDate(d));
}

export function toDate(d: Date | string): Date {
  if (d instanceof Date) return d;
  // Date-only strings (YYYY-MM-DD) are treated as local calendar dates at noon Qatar time
  // so that formatting never slips to the previous day.
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return zonedToUtc(d, "12:00");
  return new Date(d);
}

/** Calendar date (YYYY-MM-DD) of an instant in the given timezone. */
export function toDateKey(d: Date | string, tz = DEFAULT_TZ): string {
  const parts = fmt({ year: "numeric", month: "2-digit", day: "2-digit" }, tz).formatToParts(toDate(d));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Offset of a timezone (minutes east of UTC) at a given instant. */
function tzOffsetMinutes(instant: Date, tz: string): number {
  const parts = fmt({ year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }, tz).formatToParts(instant);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? "0");
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour") % 24, get("minute"), get("second"));
  return Math.round((asUtc - instant.getTime()) / 60000);
}

/** Convert a wall-clock date + time in the timezone to a UTC instant. */
export function zonedToUtc(dateKey: string, time: string, tz = DEFAULT_TZ): Date {
  const [y, m, d] = dateKey.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  const offset = tzOffsetMinutes(new Date(guess), tz);
  return new Date(guess - offset * 60000);
}

export function addDays(d: Date, n: number) {
  return new Date(d.getTime() + n * 86400000);
}
export function addDaysKey(key: string, n: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}
export function weekdayOf(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}
/** Sunday that starts the week containing the date key. */
export function startOfWeekKey(key: string, weekStartsOn = 0): string {
  const wd = weekdayOf(key);
  return addDaysKey(key, -((wd - weekStartsOn + 7) % 7));
}
export function daysBetween(fromKey: string, toKey: string): number {
  return Math.round((toDate(toKey).getTime() - toDate(fromKey).getTime()) / 86400000);
}
export function todayKey(tz = DEFAULT_TZ) {
  return toDateKey(new Date(), tz);
}
export function daysUntil(key: string) {
  return daysBetween(todayKey(), key);
}
/** "in 3 days" / "today" / "2 days ago" */
export function relativeDays(n: number) {
  if (n === 0) return "today";
  if (n === 1) return "tomorrow";
  if (n === -1) return "yesterday";
  return n > 0 ? `in ${n} days` : `${-n} days ago`;
}
export function minutesLabel(m: number) {
  if (m % 60 === 0) return `${m / 60} h`;
  return m > 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`;
}
export function isInBlackout(key: string, blackouts: { startDate: string; endDate: string }[]) {
  return blackouts.some((b) => key >= b.startDate && key <= b.endDate);
}
