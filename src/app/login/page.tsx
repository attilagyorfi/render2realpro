import Link from "next/link";

import { AuthFormCard } from "@/components/auth/auth-form-card";
import { buttonVariants } from "@/components/ui/button";

export default function LoginPage() {
  return (
    <div className="app-shell flex min-h-screen flex-col items-center justify-center gap-4 px-4 py-8">
      <AuthFormCard mode="login" />
      <Link href="/register" className={buttonVariants({ variant: "ghost", size: "sm" })}>
        Need a new profile?
      </Link>
    </div>
  );
}
