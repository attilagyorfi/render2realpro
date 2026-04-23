"use client";

import Image from "next/image";
import Link from "next/link";
import { Languages, Moon, Sun } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants, Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppPreferencesStore } from "@/store/app-preferences";

const previewContent = {
  en: {
    headerTitle: "Product Preview",
    badge: "Guided walkthrough",
    title: "Guided product preview",
    subtitle:
      "This page explains what the main areas of Render2Real Pro do before the user enters the application workspace.",
    ctaPrimary: "Create free account",
    ctaSecondary: "Back to landing",
    themeDark: "Dark",
    themeLight: "Light",
    coreArea: "Core workspace area",
    supportArea: "Operational support area",
    sections: [
      [
        "Dashboard",
        "Introduces the product promise, lets users create a new project, and acts as the starting point for the workflow.",
      ],
      [
        "Projects",
        "Collects saved projects under the active profile so users can reopen work without losing continuity.",
      ],
      [
        "Workspace",
        "Centers the visual editing and realism workflow around original versus enhanced imagery, presets, and export actions.",
      ],
      [
        "Compare",
        "Lets users review before and after output safely, keeping design validation visual and immediate.",
      ],
      [
        "Export",
        "Prepares delivery outputs for local download today and cloud or email destinations in later SaaS phases.",
      ],
      [
        "Settings and admin readiness",
        "Holds integration planning and future platform controls for multi-user rollout and governance.",
      ],
    ],
  },
  hu: {
    headerTitle: "Termékbemutató",
    badge: "Vezetett bemutató",
    title: "Vezetett termékbemutató",
    subtitle:
      "Ez az oldal bemutatja, hogy a Render2Real Pro fő felületei mire szolgálnak, mielőtt a felhasználó belépne az alkalmazás workspace-ébe.",
    ctaPrimary: "Ingyenes fiók létrehozása",
    ctaSecondary: "Vissza a landing oldalra",
    themeDark: "Sötét",
    themeLight: "Világos",
    coreArea: "Fő alkalmazási terület",
    supportArea: "Operatív támogató terület",
    sections: [
      [
        "Dashboard",
        "Bemutatja a termék alapígéretét, lehetővé teszi új projekt létrehozását, és a workflow belépési pontjaként működik.",
      ],
      [
        "Projects",
        "Az aktív profil alatt összegyűjti a mentett projekteket, hogy a felhasználó később is ugyanonnan folytathassa a munkát.",
      ],
      [
        "Workspace",
        "Az eredeti és a realizmusnövelt kép köré szervezi a vizuális szerkesztési workflow-t, presetekkel és export műveletekkel.",
      ],
      [
        "Compare",
        "Lehetővé teszi az előtte-utána review-t úgy, hogy a terv ellenőrzése vizuálisan és azonnal történjen.",
      ],
      [
        "Export",
        "Ma helyi letöltést készít elő, későbbi SaaS fázisokban pedig felhő- vagy email célokra is képes lesz.",
      ],
      [
        "Settings és admin readiness",
        "Az integrációs tervezés és a jövőbeli platformszintű kontrollok helye a többfelhasználós bevezetéshez.",
      ],
    ],
  },
} as const;

export function PreviewView() {
  const language = useAppPreferencesStore((state) => state.language);
  const setLanguage = useAppPreferencesStore((state) => state.setLanguage);
  const theme = useAppPreferencesStore((state) => state.theme);
  const toggleTheme = useAppPreferencesStore((state) => state.toggleTheme);
  const copy = previewContent[language];

  return (
    <div className="app-shell min-h-screen text-foreground">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-background/75 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[1680px] items-center justify-between gap-4 px-6 py-4">
          <div className="flex min-w-0 flex-col">
            <span className="text-[0.68rem] uppercase tracking-[0.28em] text-muted-foreground">
              Render2Real Pro
            </span>
            <h1 className="font-heading text-xl font-semibold tracking-tight">
              {copy.headerTitle}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Select value={language} onValueChange={(value) => setLanguage(value as "hu" | "en")}>
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

            <Button variant="outline" size="sm" type="button" onClick={toggleTheme}>
              {theme === "dark" ? <Moon data-icon="inline-start" /> : <Sun data-icon="inline-start" />}
              {theme === "dark" ? copy.themeDark : copy.themeLight}
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1680px] flex-col gap-8 px-4 py-6 md:px-6">
        <section className="grid gap-8 overflow-hidden rounded-[38px] border border-white/10 bg-[linear-gradient(180deg,rgba(13,18,27,0.98),rgba(22,29,42,0.96))] px-6 py-10 lg:grid-cols-[0.88fr_1.12fr] lg:px-10">
          <div className="flex flex-col justify-center gap-5">
            <Badge variant="secondary" className="w-fit bg-white/10 text-white">
              {copy.badge}
            </Badge>
            <div>
              <h2 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                {copy.title}
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-8 text-zinc-300">
                {copy.subtitle}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/register" className={buttonVariants({ variant: "default", size: "lg" })}>
                {copy.ctaPrimary}
              </Link>
              <Link href="/" className={buttonVariants({ variant: "outline", size: "lg" })}>
                {copy.ctaSecondary}
              </Link>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-black/25 p-4">
            <div className="relative h-[28rem] overflow-hidden rounded-[24px]">
              <Image
                src="/test-render.png"
                alt="Preview illustration"
                fill
                sizes="(min-width: 1280px) 40vw, 90vw"
                className="object-cover contrast-110 saturate-[1.12]"
              />
            </div>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
          {copy.sections.map(([title, body], index) => (
            <Card
              key={title}
              className={`rounded-[30px] py-6 ${
                index % 3 === 0
                  ? "border-[#8eb4da]/20 bg-[linear-gradient(180deg,rgba(142,180,218,0.16),rgba(255,255,255,0.04))]"
                  : index % 3 === 1
                    ? "border-white/10 bg-white/5"
                    : "border-[#b18b5f]/20 bg-[linear-gradient(180deg,rgba(177,139,95,0.15),rgba(255,255,255,0.04))]"
              }`}
            >
              <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription className="leading-8">{body}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-[22px] border border-white/10 bg-black/15 px-4 py-4 text-sm text-muted-foreground">
                  {index < 3
                    ? copy.coreArea
                    : copy.supportArea}
                </div>
              </CardContent>
            </Card>
          ))}
        </section>
      </main>
    </div>
  );
}
