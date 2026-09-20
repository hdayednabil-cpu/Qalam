import en from "@/messages/en";

export type Locale = "en" | "ar";
const dictionaries: Record<Locale, unknown> = { en, ar: en /* placeholder until ar.ts ships */ };
const RTL: Locale[] = ["ar"];

export function getLocale(): Locale {
  return "en";
}
export function dir(locale: Locale = getLocale()): "ltr" | "rtl" {
  return RTL.includes(locale) ? "rtl" : "ltr";
}

type Vars = Record<string, string | number>;

/** t("tutor.packageRemaining", { n: 3, total: 8 }) */
export function t(key: string, vars?: Vars, locale: Locale = getLocale()): string {
  const parts = key.split(".");
  let cur: unknown = dictionaries[locale];
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in (cur as Record<string, unknown>)) cur = (cur as Record<string, unknown>)[p];
    else {
      cur = undefined;
      break;
    }
  }
  let out = typeof cur === "string" ? cur : key;
  if (vars) for (const [k, v] of Object.entries(vars)) out = out.replaceAll(`{${k}}`, String(v));
  return out;
}

export const statusLabel = (s: string) => t(`status.${s}`);
export const masteryLabel = (m: string) => t(`mastery.${m}`);
export const revisionLabel = (r: string) => t(`revision.${r}`);
export const visibilityLabel = (v: string) => t(`visibility.${v}`);
