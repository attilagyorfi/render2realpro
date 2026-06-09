import type { Metadata } from "next";
import "./globals.css";
import { AppProviders } from "./providers";
import { BRAND } from "@/config/brand";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://formaveris.hu";

/**
 * Root metadata. Every per-page metadata export inherits these and only
 * needs to override the bits that differ (e.g. `robots: { index: false }`
 * for auth pages and the public share link).
 *
 * The title template "%s · FormaVeris" turns a page's metadata.title into
 * "Belépés · FormaVeris" automatically.
 */
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${BRAND.name} — Építészeti render realizmusnövelés`,
    template: `%s · ${BRAND.name}`,
  },
  description:
    "Jóváhagyott építészeti renderekből fotórealisztikus, átadásra kész képek — a geometria, a kameraállás és a kompozíció pontos megőrzésével. Építészeknek, mérnököknek és látványtervező stúdióknak.",
  keywords: [
    "építészeti vizualizáció",
    "render utómunka",
    "archviz",
    "fotorealisztikus render",
    "AI render",
    "ControlNet",
    BRAND.name,
  ],
  applicationName: BRAND.name,
  authors: [{ name: BRAND.legalName }],
  openGraph: {
    type: "website",
    locale: "hu_HU",
    siteName: BRAND.name,
    title: `${BRAND.name} — Építészeti render realizmusnövelés`,
    description:
      "A terv változatlan marad. Csak a realizmus nő. Jóváhagyott látványterveidet fotórealisztikus képpé alakítjuk — geometria-, kompozíció- és kameraállás-megőrzéssel.",
    // Placeholder until a dedicated 1200×630 OG image lands in /public/og/.
    // Using the hero "after" render gives social-share previews something
    // representative instead of falling back to a generic Next.js card.
    images: [{ url: "/hero-render-after.webp", width: 1200, height: 630, alt: BRAND.name }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${BRAND.name} — Építészeti render realizmusnövelés`,
    description:
      "Fotórealisztikus építészeti renderek a kompozíció megőrzésével.",
    images: ["/hero-render-after.webp"],
  },
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="hu" className="dark h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-background">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
