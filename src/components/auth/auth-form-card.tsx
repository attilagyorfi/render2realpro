"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { t } from "@/i18n";
import { useAppPreferencesStore } from "@/store/app-preferences";

type AuthMode = "login" | "register";

const MIN_PASSWORD_LENGTH = 8;

/**
 * Inline label for the terms-acceptance checkbox. Hand-composed JSX
 * rather than a single i18n string because of the two inline links —
 * trying to template "Elfogadom az {0}-et és az {1}-ot" out of the
 * dictionary makes the surrounding code more brittle than it earns.
 */
function TermsAcceptanceLabel({ language }: { language: "hu" | "en" }) {
  if (language === "hu") {
    return (
      <>
        Elfogadom az{" "}
        <Link href="/jogi/aszf" target="_blank" className="underline hover:text-foreground">
          ÁSZF
        </Link>
        -et és az{" "}
        <Link
          href="/jogi/adatkezeles"
          target="_blank"
          className="underline hover:text-foreground"
        >
          Adatkezelési tájékoztatót
        </Link>
        .
      </>
    );
  }
  return (
    <>
      I accept the{" "}
      <Link href="/jogi/aszf" target="_blank" className="underline hover:text-foreground">
        Terms
      </Link>{" "}
      and the{" "}
      <Link
        href="/jogi/adatkezeles"
        target="_blank"
        className="underline hover:text-foreground"
      >
        Privacy Policy
      </Link>
      .
    </>
  );
}

export function AuthFormCard({ mode }: { mode: AuthMode }) {
  const language = useAppPreferencesStore((state) => state.language);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // After a successful registration, the API returns { pending: true }
  // and we swap the form for an "awaiting approval" panel rather than
  // bouncing the user to /app (where the guard would block them anyway).
  const [pendingDone, setPendingDone] = useState(false);

  const isRegister = mode === "register";

  const passwordOk = password.length >= MIN_PASSWORD_LENGTH;
  const formInvalid =
    !email ||
    !passwordOk ||
    (isRegister && (name.trim().length < 2 || !acceptedTerms));

  const submit = async () => {
    try {
      setSubmitting(true);
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isRegister ? { name, email, password } : { email, password }
        ),
      });

      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        // body.error comes from the API, which is now sanitized
        // server-side (no raw stack traces or DB internals). A handful
        // of sentinel strings get mapped to i18n messages so the user
        // sees Hungarian, not a code.
        const raw = typeof body.error === "string" ? body.error : "";
        const mapped =
          raw === "AUTH_ACCOUNT_PENDING"
            ? t("auth.pendingAccount", language)
            : raw === "AUTH_ACCOUNT_REJECTED"
              ? t("auth.rejectedAccount", language)
              : raw || t("auth.failed", language);
        throw new Error(mapped);
      }

      // Registration: surface a "pending" panel and stop. Don't try
      // to push the user into /app — the account is not approved yet.
      if (isRegister && body?.pending === true) {
        toast.success(t("auth.profileCreated", language));
        setPendingDone(true);
        return;
      }

      toast.success(
        t(isRegister ? "auth.profileCreated" : "auth.signedIn", language)
      );
      window.location.assign("/app");
    } catch (error) {
      const message = error instanceof Error ? error.message : t("auth.failed", language);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  // After a successful pending registration, replace the entire form
  // with a confirmation panel. The user can still see the back-arrow
  // and the cross-link from AuthShell to navigate away.
  if (pendingDone) {
    return (
      <Card className="w-full max-w-lg border-white/10 bg-white/5 backdrop-blur-2xl">
        <CardHeader>
          <CardTitle>{t("auth.pendingTitle", language)}</CardTitle>
          <CardDescription>{t("auth.pendingBody", language)}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-lg border-white/10 bg-white/5 backdrop-blur-2xl">
      <CardHeader>
        <CardTitle>
          {t(isRegister ? "auth.createTitle" : "auth.signInTitle", language)}
        </CardTitle>
        <CardDescription>
          {t(isRegister ? "auth.createBody" : "auth.signInBody", language)}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {isRegister ? (
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t("auth.fullName", language)}
          />
        ) : null}
        <Input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={t("auth.emailPlaceholder", language)}
          type="email"
          autoComplete="email"
        />
        <Input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder={t(
            isRegister
              ? "auth.passwordPlaceholderRegister"
              : "auth.passwordPlaceholder",
            language
          )}
          type="password"
          autoComplete={isRegister ? "new-password" : "current-password"}
          minLength={MIN_PASSWORD_LENGTH}
        />
        {isRegister && password.length > 0 && !passwordOk ? (
          <p className="text-xs text-amber-300/80">
            {t("auth.passwordHint", language)}
          </p>
        ) : null}

        {isRegister ? (
          <label className="mt-1 flex items-start gap-2.5 cursor-pointer text-xs leading-relaxed text-muted-foreground select-none">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(event) => setAcceptedTerms(event.target.checked)}
              className="mt-0.5 size-4 shrink-0 cursor-pointer rounded border border-white/20 bg-white/5 text-violet-500 focus:ring-1 focus:ring-violet-500/60"
            />
            <span>
              <TermsAcceptanceLabel language={language} />
            </span>
          </label>
        ) : null}

        <Button
          type="button"
          onClick={submit}
          disabled={submitting || formInvalid}
        >
          {t(isRegister ? "auth.createCta" : "auth.continueCta", language)}
        </Button>
      </CardContent>
    </Card>
  );
}
