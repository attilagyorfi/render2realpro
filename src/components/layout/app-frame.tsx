"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  FolderKanban,
  Languages,
  LayoutGrid,
  Settings2,
  ShieldUser,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusDot } from "@/components/ui/status-dot";
import { t, type Language } from "@/i18n";
import { useAppPreferencesStore } from "@/store/app-preferences";

const navigationItems = [
  { href: "/app", labelKey: "common.dashboard", icon: LayoutGrid },
  { href: "/app/projects", labelKey: "dashboard.projects", icon: FolderKanban },
  { href: "/app/settings", labelKey: "common.settings", icon: Settings2 },
  { href: "/app/admin", labelKey: "common.admin", icon: ShieldUser },
];

type SessionResponse = {
  profile: { id: string; email: string; name: string } | null;
};

export function AppFrame({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const language = useAppPreferencesStore((state) => state.language);
  const setLanguage = useAppPreferencesStore((state) => state.setLanguage);
  const isAppRoute = pathname.startsWith("/app");

  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ["auth-session"],
    queryFn: async () => {
      const response = await fetch("/api/auth/session", {
        cache: "no-store",
      });

      if (response.status === 401) {
        return { profile: null };
      }

      if (!response.ok) {
        throw new Error("Unable to load session.");
      }

      return response.json() as Promise<SessionResponse>;
    },
    retry: false,
    enabled: isAppRoute,
  });

  const signOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    toast.success(t("common.signOut", language));
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="app-shell min-h-screen text-foreground">
      <header className="sticky top-0 z-30 border-b border-[color:var(--border-subtle)]/80 bg-[color:color-mix(in_srgb,var(--bg-base)_86%,transparent)] backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[1680px] items-center justify-between gap-6 px-6 py-4">
          <div className="flex items-center gap-3 min-w-0">
            {/* Logo — navigates to landing page */}
            <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
              <Image src="/logo.png" alt="Render2Real Pro" width={30} height={30} className="rounded-lg" />
              <span className="hidden font-heading text-sm font-semibold tracking-tight text-foreground group-hover:text-blue-400 transition-colors md:block">
                render2real <span className="text-blue-400">pro</span>
              </span>
            </Link>
            <div className="h-5 w-px bg-white/10 hidden md:block" />
            <div className="flex min-w-0 flex-col">
              <span className="text-[0.68rem] uppercase tracking-[0.28em] text-muted-foreground">
                {eyebrow}
              </span>
              <h1 className="font-heading text-xl font-semibold tracking-tight text-foreground">
                {title}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <nav className="hidden items-center gap-2 md:flex">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={buttonVariants({
                      variant: isActive ? "secondary" : "ghost",
                      size: "sm",
                      className: isActive
                        ? "surface-chip text-foreground shadow-sm"
                        : "text-muted-foreground",
                    })}
                  >
                    <Icon data-icon="inline-start" />
                    {t(item.labelKey, language)}
                  </Link>
                );
              })}
            </nav>

            {isAppRoute && session?.profile ? (
              <>
                <div className="surface-chip hidden items-center gap-2 rounded-full px-3 py-1.5 text-xs text-muted-foreground md:flex">
                  <StatusDot tone="success" />
                  <span className="max-w-72 truncate">
                    {session.profile.name} · {session.profile.email}
                  </span>
                </div>
                <Button variant="outline" size="sm" type="button" onClick={signOut}>
                  {t("common.signOut", language)}
                </Button>
              </>
            ) : null}
            <Select value={language} onValueChange={(value) => setLanguage(value as Language)}>
              <SelectTrigger size="sm" className="min-w-28">
                <Languages data-icon="inline-start" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectGroup>
                  <SelectItem value="hu">Magyar</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1680px] flex-col px-4 py-4 md:px-6">
        {isAppRoute && sessionLoading ? (
          <div className="flex min-h-[60vh] items-center justify-center">
            <Card className="surface-panel w-full max-w-xl">
              <CardHeader>
                <CardTitle>{t("auth.sessionLoadingTitle", language)}</CardTitle>
                <CardDescription>{t("auth.sessionLoadingBody", language)}</CardDescription>
              </CardHeader>
            </Card>
          </div>
        ) : isAppRoute && !session?.profile ? (
          <div className="flex min-h-[60vh] items-center justify-center">
            <Card className="surface-panel w-full max-w-xl">
              <CardHeader>
                <CardTitle>{t("auth.workspaceGuardTitle", language)}</CardTitle>
                <CardDescription>{t("auth.workspaceGuardBody", language)}</CardDescription>
              </CardHeader>
              <CardContent className="flex gap-3">
                <Link
                  href="/login"
                  className={buttonVariants({ variant: "default", size: "default" })}
                >
                  {t("common.signIn", language)}
                </Link>
                <Link
                  href="/register"
                  className={buttonVariants({ variant: "outline", size: "default" })}
                >
                  {t("common.createProfile", language)}
                </Link>
              </CardContent>
            </Card>
          </div>
        ) : (
          children
        )}
      </main>
    </div>
  );
}
