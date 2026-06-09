import type { Metadata } from "next";

import { AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = {
  title: "Regisztráció",
  robots: { index: false, follow: false },
};

export default function RegisterPage() {
  return <AuthShell mode="register" />;
}
