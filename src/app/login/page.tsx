import type { Metadata } from "next";

import { AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = {
  title: "Belépés",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return <AuthShell mode="login" />;
}
