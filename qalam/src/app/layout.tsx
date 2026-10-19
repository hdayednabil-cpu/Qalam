import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/manrope";
import "./globals.css";
import { dir, getLocale, t } from "@/lib/i18n";
import { AmbientMotionProvider } from "@/components/ambient-motion";

export const metadata: Metadata = { title: { default: t("app.name"), template: `%s · ${t("app.name")}` }, description: t("app.tagline") };
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#f5f6fa" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = getLocale();
  return (
    <html lang={locale} dir={dir(locale)}>
      <body className="min-h-dvh"><AmbientMotionProvider>{children}</AmbientMotionProvider></body>
    </html>
  );
}
