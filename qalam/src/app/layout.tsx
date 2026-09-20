import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/fraunces";
import "./globals.css";
import { dir, getLocale, t } from "@/lib/i18n";

export const metadata: Metadata = { title: { default: t("app.name"), template: `%s · ${t("app.name")}` }, description: t("app.tagline") };
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#f6f3ec" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = getLocale();
  return (
    <html lang={locale} dir={dir(locale)}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
