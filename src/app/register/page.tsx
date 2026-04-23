import Link from "next/link";

import { AuthFormCard } from "@/components/auth/auth-form-card";
import { buttonVariants } from "@/components/ui/button";

export default function RegisterPage() {
  return (
    <div className="app-shell flex min-h-screen flex-col items-center justify-center gap-4 px-4 py-8">
      <AuthFormCard mode="register" />
      <div className="flex items-center gap-3">
        <Link href="/login" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          Already have a profile?
        </Link>
        <Link href="/" className={buttonVariants({ variant: "outline", size: "sm" })}>
          Back to landing
        </Link>
      </div>
    </div>
  );
}
