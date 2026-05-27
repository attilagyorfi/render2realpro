"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { AuthFormCard } from "@/components/auth/auth-form-card";
import { buttonVariants } from "@/components/ui/button";
import { t } from "@/i18n";
import { useAppPreferencesStore } from "@/store/app-preferences";

type AuthShellMode = "login" | "register";

/**
 * Page shell shared by /login and /register so they look and behave
 * identically (back-to-home arrow at the top-left, the auth card centred,
 * a single cross-link to the other auth flow at the bottom). All copy
 * comes from the i18n dictionary so the page respects the user's
 * language preference.
 */
export function AuthShell({ mode }: { mode: AuthShellMode }) {
  const language = useAppPreferencesStore((state) => state.language);
  const isLogin = mode === "login";

  return (
    <div className="app-shell flex min-h-screen flex-col px-4 py-6">
      <div className="mx-auto w-full max-w-lg">
        <Link
          href="/"
          className={buttonVariants({
            variant: "ghost",
            size: "sm",
            className: "text-muted-foreground",
          })}
        >
          <ArrowLeft data-icon="inline-start" />
          {t("common.backToHome", language)}
        </Link>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <AuthFormCard mode={mode} />
        <Link
          href={isLogin ? "/register" : "/login"}
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          {isLogin
            ? t("auth.needAccount", language)
            : t("auth.haveAccount", language)}
        </Link>
      </div>
    </div>
  );
}
