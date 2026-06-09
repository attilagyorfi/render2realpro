import type { Metadata } from "next";
import "./globals.css";
import { AppProviders } from "./providers";
import { BRAND } from "@/config/brand";

export const metadata: Metadata = {
  title: BRAND.name,
  description: BRAND.description,
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
