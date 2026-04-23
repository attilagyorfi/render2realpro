"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ChevronUp,
  Languages,
  Moon,
  ShieldCheck,
  Sun,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppPreferencesStore } from "@/store/app-preferences";

const content = {
  en: {
    nav: {
      workflow: "Workflow",
      compare: "Compare",
      preview: "Preview",
      pricing: "Pricing",
      faq: "FAQ",
      signIn: "Sign in",
      create: "Create free account",
    },
    hero: {
      eyebrow: "Precision-first architectural realism",
      badge: "Premium B2B workflow",
      title: "The design stays unchanged. Only the realism increases.",
      body:
        "Render2Real Pro helps architects, engineers, and visualization studios turn approved renders into photoreal delivery assets while preserving exact geometry, exact camera angle, and exact scene layout.",
      primaryCta: "Create free account",
      secondaryCta: "Explore product preview",
      original: "Original render",
      output: "Realism-enhanced result",
      bullets: [
        "Exact camera preserved",
        "Exact geometry preserved",
        "No redesign, no hallucinated objects",
      ],
    },
    stats: [
      ["Output promise", "No redesign"],
      ["Audience", "Architects and engineers"],
      ["Workflow", "Review-safe realism pass"],
      ["Delivery", "Local export now, cloud-ready next"],
    ],
    integrations: {
      title: "Fits into the tools architecture teams already use.",
      items: ["Revit", "Archicad", "SketchUp", "3ds Max", "Blender", "REST API ready"],
    },
    trust: {
      eyebrow: "Non-negotiable rules",
      title: "Every result is constrained by architectural fidelity.",
      items: [
        "Exact camera angle",
        "Exact geometry and massing",
        "Exact site layout and object placement",
        "No fantasy additions or scene redesign",
      ],
    },
    workflow: {
      eyebrow: "Workflow",
      title: "A controlled sequence built for review-safe image delivery.",
      body:
        "The workflow is structured around preservation first, then realism refinement. Every step exists to improve believability without changing the approved architectural decision.",
      steps: [
        ["01", "Upload the approved render"],
        ["02", "Apply a realism preset"],
        ["03", "Generate without redesign"],
        ["04", "Compare and export"],
      ],
    },
    comparison: {
      eyebrow: "Comparison showcase",
      title: "Photoreal refinement without changing the architectural decision.",
      body:
        "Materials can feel richer, reflections more disciplined, and shadows more believable, while the building, site, and camera remain fixed.",
      bullets: [
        "Facade rhythm and proportions remain intact",
        "Roads, rails, vehicles, and site placement remain fixed",
        "The result stays suitable for review and presentation",
      ],
      before: "Before",
      after: "After",
    },
    preview: {
      eyebrow: "Product preview",
      title: "A visual workspace built for review, not prompt tweaking.",
      body:
        "The app centers image review, versions, compare mode, presets, exports, and operational clarity so teams can evaluate realism quickly.",
      cta: "Open guided preview",
      items: ["Dashboard", "Projects", "Workspace", "Compare", "Export"],
      panelTitle: "Compare-ready workspace",
    },
    why: {
      eyebrow: "Why it is different",
      title: "Not a generic AI image generator. A realism enhancement product for architecture.",
      items: [
        [
          "Built for architectural fidelity",
          "Camera, massing, facade rhythm, and scene composition are treated as invariants, not suggestions.",
        ],
        [
          "Optimized for engineering review",
          "The product emphasizes side-by-side validation and version tracking instead of opaque image prompts.",
        ],
        [
          "Ready for real studio workflows",
          "Projects, profiles, compare mode, export destinations, and admin readiness support a scalable SaaS direction.",
        ],
      ],
    },
    pricing: {
      eyebrow: "Pricing",
      title: "Structured for pilot adoption now, scalable studio rollout later.",
      body:
        "Start with a free local pilot profile, then scale into the studio workflow most firms will actually want to standardize on.",
      highlightLabel: "Best value",
      plans: [
        {
          name: "Starter",
          price: "Free",
          description: "For pilot users validating the workflow on real architectural renders.",
          bullets: [
            "Single-user local profile",
            "Project workspace and compare mode",
            "Local export and version history",
          ],
          cta: "Start free",
        },
        {
          name: "Studio",
          price: "Recommended",
          description:
            "For architecture studios and engineering offices processing client-ready imagery at scale.",
          bullets: [
            "Shared presets and batch-oriented workflow",
            "Cloud and email delivery destinations",
            "Stronger project management and operator clarity",
          ],
          cta: "Join Studio waitlist",
        },
        {
          name: "Enterprise",
          price: "Custom",
          description:
            "For firms standardizing realism enhancement across departments, projects, and governance layers.",
          bullets: [
            "Admin and governance controls",
            "Provider policy and integration management",
            "Structured onboarding and rollout support",
          ],
          cta: "Request enterprise demo",
        },
      ],
    },
    faq: {
      eyebrow: "FAQ",
      title: "Questions architecture teams usually ask first.",
      items: [
        [
          "Does the software redesign the building?",
          "No. The product is explicitly built around realism enhancement while preserving the approved architectural composition, geometry, and scene logic.",
        ],
        [
          "Can this replace final archviz retouching entirely?",
          "Not always. For some projects it can dramatically reduce the amount of manual post-processing, but the real value is faster delivery-ready realism without losing design control.",
        ],
        [
          "Is this already a cloud SaaS?",
          "The current phase is local-first, but profiles, preview flow, admin readiness, and export destination design are being shaped toward SaaS rollout.",
        ],
        [
          "Who is the ideal user?",
          "Architects, engineers, visualization teams, and studios that care more about preserving the design than generating creative variations.",
        ],
      ],
    },
    final: {
      title: "Preserve the design intent. Deliver the image with higher realism.",
      body:
        "Created for architecture and engineering teams that need image quality to improve without sacrificing trust in what the render actually represents.",
      primary: "Create free account",
      secondary: "Explore product preview",
    },
    backToTop: "Back to top",
    theme: {
      dark: "Dark",
      light: "Light",
    },
  },
  hu: {
    nav: {
      workflow: "Workflow",
      compare: "Összehasonlítás",
      preview: "Előnézet",
      pricing: "Csomagok",
      faq: "GYIK",
      signIn: "Belépés",
      create: "Ingyenes fiók létrehozása",
    },
    hero: {
      eyebrow: "Pontosságközpontú építészeti realizmus",
      badge: "Prémium B2B workflow",
      title: "A terv változatlan marad. Csak a realizmus nő.",
      body:
        "A Render2Real Pro építészeknek, mérnököknek és látványtervező stúdióknak segít jóváhagyott renderekből fotórealisztikus, átadásra kész képeket készíteni úgy, hogy a geometria, a kameraállás és a jelenet elrendezése változatlan marad.",
      primaryCta: "Ingyenes fiók létrehozása",
      secondaryCta: "Termékbemutató megnyitása",
      original: "Eredeti render",
      output: "Realizmusnövelt eredmény",
      bullets: [
        "A kamera változatlan marad",
        "A geometria változatlan marad",
        "Nincs újratervezés és nincsenek hallucinált elemek",
      ],
    },
    stats: [
      ["Alapígéret", "Nincs újratervezés"],
      ["Célcsoport", "Építészek és mérnökök"],
      ["Workflow", "Review-safe realizmus passz"],
      ["Kézbesítés", "Ma helyi export, később felhő-kész"],
    ],
    integrations: {
      title: "Illeszkedik azokhoz az eszközökhöz, amelyeket az építészeti csapatok már ma is használnak.",
      items: ["Revit", "Archicad", "SketchUp", "3ds Max", "Blender", "REST API előkészítés"],
    },
    trust: {
      eyebrow: "Nem alkuképes szabályok",
      title: "Minden eredményt építészeti hűség korlátoz.",
      items: [
        "Pontos kameraállás",
        "Pontos geometria és tömegformálás",
        "Pontos helyszínelrendezés és objektumelhelyezés",
        "Nincs fantáziaelem és nincs jelenet-újratervezés",
      ],
    },
    workflow: {
      eyebrow: "Workflow",
      title: "Kontrollált folyamat review-biztos képi átadáshoz.",
      body:
        "A workflow először a megőrzésre, utána a realizmus finomítására épül. Minden lépés azért van, hogy javuljon a hihetőség anélkül, hogy megváltozna a jóváhagyott építészeti döntés.",
      steps: [
        ["01", "Jóváhagyott render feltöltése"],
        ["02", "Realizmus preset kiválasztása"],
        ["03", "Generálás újratervezés nélkül"],
        ["04", "Összehasonlítás és export"],
      ],
    },
    comparison: {
      eyebrow: "Összehasonlítás",
      title: "Fotórealisztikus finomítás az építészeti döntés megváltoztatása nélkül.",
      body:
        "Az anyagok gazdagabbnak, a reflexiók fegyelmezettebbnek, az árnyékok hihetőbbnek tűnhetnek, miközben az épület, a helyszín és a kamera változatlan marad.",
      bullets: [
        "A homlokzati ritmus és arányok változatlanok maradnak",
        "Az utak, sínek, járművek és helyszíni elemek pozíciója rögzített",
        "Az eredmény review-ra és prezentációra is alkalmas marad",
      ],
      before: "Előtte",
      after: "Utána",
    },
    preview: {
      eyebrow: "Termékbemutató",
      title: "Képi review-ra épülő workspace, nem prompt-bütykölésre.",
      body:
        "Az alkalmazás a képi ellenőrzésre, a verziókra, az összehasonlításra, a presetekre és az exportokra fókuszál, hogy a csapat gyorsan értékelhesse a realizmust.",
      cta: "Vezetett preview megnyitása",
      items: ["Dashboard", "Projects", "Workspace", "Compare", "Export"],
      panelTitle: "Összehasonlításra kész workspace",
    },
    why: {
      eyebrow: "Miért más",
      title: "Nem általános AI képgenerátor. Hanem építészeti realizmusnövelő termék.",
      items: [
        [
          "Építészeti hűségre tervezve",
          "A kamera, a tömegformálás, a homlokzati ritmus és a jelenet kompozíciója itt nem javaslat, hanem invariáns.",
        ],
        [
          "Mérnöki review-ra optimalizálva",
          "A termék az egymás melletti ellenőrzést és a verziókövetést hangsúlyozza, nem az átláthatatlan promptolást.",
        ],
        [
          "Valódi stúdió workflow-hoz készítve",
          "Projektkezelés, profilok, compare mód, export célok és admin readiness támogatja a skálázható SaaS irányt.",
        ],
      ],
    },
    pricing: {
      eyebrow: "Csomagok",
      title: "Ma pilot használatra, később stúdiószintű skálázásra kialakítva.",
      body:
        "Kezdj egy ingyenes helyi pilot profillal, majd lépj tovább abba a stúdió workflow-ba, amelyet a legtöbb iroda valóban standardizálni akar majd.",
      highlightLabel: "Legjobb érték",
      plans: [
        {
          name: "Starter",
          price: "Ingyenes",
          description: "Pilot felhasználóknak, akik valós építészeti rendereken validálják a workflow-t.",
          bullets: [
            "Egyfelhasználós helyi profil",
            "Projekt workspace és compare mód",
            "Helyi export és verzióelőzmény",
          ],
          cta: "Kezdés ingyen",
        },
        {
          name: "Studio",
          price: "Ajánlott",
          description:
            "Építészeti stúdióknak és mérnökirodáknak, akik ügyfélkész vizuálokat dolgoznak fel nagyobb mennyiségben.",
          bullets: [
            "Megosztott presetek és batch-orientált workflow",
            "Felhő- és email-alapú kézbesítési célok",
            "Erősebb projektkezelés és operátori átláthatóság",
          ],
          cta: "Studio várólista",
        },
        {
          name: "Enterprise",
          price: "Egyedi",
          description:
            "Olyan cégeknek, akik osztályok, projektek és governance rétegek között standardizálnák a realizmusnövelést.",
          bullets: [
            "Admin és governance kontrollok",
            "Provider policy és integrációkezelés",
            "Strukturált onboarding és bevezetés",
          ],
          cta: "Enterprise demo kérése",
        },
      ],
    },
    faq: {
      eyebrow: "GYIK",
      title: "A kérdések, amelyeket az építészeti csapatok először feltesznek.",
      items: [
        [
          "Újratervezi az épületet a szoftver?",
          "Nem. A termék kifejezetten úgy készült, hogy realizmust növeljen, miközben megőrzi a jóváhagyott kompozíciót, geometriát és jelenetlogikát.",
        ],
        [
          "Kiváltja a végső archviz retust teljesen?",
          "Nem minden esetben. Viszont jelentősen csökkentheti az utómunka mennyiségét, miközben megmarad a tervezői kontroll.",
        ],
        [
          "Ez már felhőalapú SaaS?",
          "A jelenlegi fázis local-first, de a profilok, preview flow, admin readiness és export célok már a SaaS bevezetés irányába készülnek.",
        ],
        [
          "Kinek ideális a használata?",
          "Építészeknek, mérnököknek, látványtervező csapatoknak és olyan stúdióknak, akiknek fontosabb a terv megőrzése, mint a kreatív variációgyártás.",
        ],
      ],
    },
    final: {
      title: "Őrizd meg a terv szándékát. Add át a képet magasabb realizmussal.",
      body:
        "Azoknak az építészeti és mérnöki csapatoknak készült, akik szeretnék javítani a képi minőséget anélkül, hogy elveszne a bizalom abban, amit a render valójában ábrázol.",
      primary: "Ingyenes fiók létrehozása",
      secondary: "Termékbemutató megnyitása",
    },
    backToTop: "Vissza az elejére",
    theme: {
      dark: "Sötét",
      light: "Világos",
    },
  },
} as const;

const reveal = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  transition: { duration: 0.6 },
  viewport: { once: true, amount: 0.18 },
} as const;

export function getPricingHighlightTier() {
  return "studio" as const;
}

export function LandingView() {
  const language = useAppPreferencesStore((state) => state.language);
  const setLanguage = useAppPreferencesStore((state) => state.setLanguage);
  const theme = useAppPreferencesStore((state) => state.theme);
  const toggleTheme = useAppPreferencesStore((state) => state.toggleTheme);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const copy = content[language];

  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 720);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="app-shell min-h-screen text-foreground">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[1680px] items-center justify-between gap-4 px-6 py-4">
          <div className="flex min-w-0 flex-col">
            <span className="text-[0.68rem] uppercase tracking-[0.28em] text-muted-foreground">
              M Mérnöki Iroda Kft.
            </span>
            <h1 className="font-heading text-xl font-semibold tracking-tight">
              Render2Real Pro
            </h1>
          </div>

          <nav className="hidden items-center gap-6 text-sm text-muted-foreground xl:flex">
            <a href="#workflow" className="transition hover:text-foreground">
              {copy.nav.workflow}
            </a>
            <a href="#compare" className="transition hover:text-foreground">
              {copy.nav.compare}
            </a>
            <a href="#preview" className="transition hover:text-foreground">
              {copy.nav.preview}
            </a>
            <a href="#pricing" className="transition hover:text-foreground">
              {copy.nav.pricing}
            </a>
            <a href="#faq" className="transition hover:text-foreground">
              {copy.nav.faq}
            </a>
          </nav>

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
              {theme === "dark" ? copy.theme.dark : copy.theme.light}
            </Button>

            <Link href="/login" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              {copy.nav.signIn}
            </Link>
            <Link href="/register" className={buttonVariants({ variant: "default", size: "sm" })}>
              {copy.nav.create}
            </Link>
          </div>
        </div>
      </header>

      <main className="pb-12">
        <motion.section
          {...reveal}
          className="relative isolate overflow-hidden border-b border-white/10 bg-[linear-gradient(180deg,#0b0d13_0%,#151b28_100%)]"
        >
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:80px_80px] opacity-25" />
          <div className="absolute left-[-10%] top-[-8rem] size-[36rem] rounded-full bg-[radial-gradient(circle,rgba(75,120,255,0.38),transparent_62%)] blur-3xl" />
          <div className="absolute bottom-[-12rem] right-[-8%] size-[32rem] rounded-full bg-[radial-gradient(circle,rgba(177,139,95,0.22),transparent_62%)] blur-3xl" />

          <div className="relative mx-auto grid min-h-[calc(100svh-73px)] w-full max-w-[1840px] gap-10 px-4 py-8 md:px-6 lg:grid-cols-[0.7fr_1.3fr] lg:items-end lg:px-8 lg:py-10">
            <div className="flex max-w-xl flex-col justify-end gap-6 lg:pb-10">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="bg-white/10 text-white">
                  {copy.hero.eyebrow}
                </Badge>
                <Badge variant="outline" className="border-white/15 text-zinc-300">
                  {copy.hero.badge}
                </Badge>
              </div>

              <div>
                <h2 className="text-4xl font-semibold leading-[0.96] tracking-[-0.05em] text-white sm:text-6xl xl:text-[5.5rem]">
                  {copy.hero.title}
                </h2>
                <p className="mt-6 max-w-lg text-base leading-8 text-zinc-300 lg:text-lg">
                  {copy.hero.body}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link href="/register" className={buttonVariants({ variant: "default", size: "lg" })}>
                  {copy.hero.primaryCta}
                </Link>
                <Link href="/preview" className={buttonVariants({ variant: "outline", size: "lg" })}>
                  {copy.hero.secondaryCta}
                </Link>
              </div>

              <div className="grid gap-3 pt-2">
                {copy.hero.bullets.map((item) => (
                  <div key={item} className="flex items-center gap-3 text-sm text-zinc-200">
                    <ShieldCheck className="size-4 text-white" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-[1.12fr_0.88fr]">
              <div className="relative overflow-hidden rounded-[40px] border border-white/10 bg-[linear-gradient(180deg,rgba(66,46,255,0.92),rgba(52,39,226,0.92))] p-5 shadow-2xl shadow-black/30">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.12)_1px,transparent_1px)] bg-[size:56px_56px] opacity-35" />
                <div className="relative z-10 flex items-center justify-between">
                  <span className="rounded-full border border-white/20 bg-black/20 px-4 py-2 text-[0.72rem] uppercase tracking-[0.22em] text-zinc-200">
                    {copy.hero.original}
                  </span>
                </div>
                <div className="relative z-10 mt-5">
                  <div className="text-[4.9rem] font-semibold leading-none tracking-[-0.08em] text-white sm:text-[7.5rem] xl:text-[10rem]">
                    REAL
                  </div>
                  <div className="mt-4 max-w-xs text-xl leading-[1.05] text-white sm:text-3xl">
                    Architecture-safe realism, built for delivery.
                  </div>
                </div>
                <div className="relative z-10 mt-8 overflow-hidden rounded-[30px] border border-white/15 bg-black/15">
                  <div className="relative h-[23rem] sm:h-[28rem] xl:h-[34rem]">
                    <Image
                      src="/test-render.png"
                      alt={copy.hero.original}
                      fill
                      sizes="(min-width: 1280px) 44vw, 100vw"
                      className="object-cover object-center"
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-5">
                <div className="overflow-hidden rounded-[34px] border border-[#7c664c]/30 bg-[linear-gradient(180deg,rgba(58,46,36,0.94),rgba(17,14,13,0.96))] p-5 shadow-xl shadow-black/20">
                  <span className="rounded-full border border-white/15 bg-black/20 px-4 py-2 text-[0.72rem] uppercase tracking-[0.22em] text-zinc-200">
                    {copy.hero.output}
                  </span>
                  <div className="mt-5 overflow-hidden rounded-[26px] border border-white/10">
                    <div className="relative h-[17rem] sm:h-[21rem] xl:h-[24rem]">
                      <Image
                        src="/test-render.png"
                        alt={copy.hero.output}
                        fill
                        sizes="(min-width: 1280px) 24vw, 100vw"
                        className="object-cover object-center contrast-110 saturate-[1.18] sepia-[0.12]"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-1">
                  {copy.stats.map(([label, value], index) => (
                    <div
                      key={label}
                      className={`rounded-[28px] border px-5 py-5 ${
                        index === 1
                          ? "border-[#8eb4da]/30 bg-[#8eb4da]/12"
                          : index === 3
                            ? "border-[#b18b5f]/30 bg-[#b18b5f]/12"
                            : "border-white/10 bg-white/6"
                      }`}
                    >
                      <div className="text-[0.68rem] uppercase tracking-[0.2em] text-zinc-400">
                        {label}
                      </div>
                      <div className="mt-3 text-base font-medium text-white">{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-20 px-4 pt-12 md:px-6 lg:gap-28 lg:pt-16">
          <motion.section
            {...reveal}
            className="flex flex-col gap-6 border-b border-white/10 pb-10 lg:flex-row lg:items-end lg:justify-between"
          >
            <div className="max-w-2xl">
              <div className="text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">
                {copy.trust.eyebrow}
              </div>
              <h3 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl lg:text-[3.25rem]">
                {copy.trust.title}
              </h3>
            </div>
            <div className="grid gap-3 lg:max-w-2xl lg:grid-cols-2">
              {copy.trust.items.map((item) => (
                <div key={item} className="border-b border-[color:var(--border-subtle)] pb-3 text-sm leading-7 text-muted-foreground">
                  {item}
                </div>
              ))}
            </div>
          </motion.section>

          <motion.section
            {...reveal}
            className="flex flex-col gap-6 border-b border-white/10 pb-10 xl:flex-row xl:items-center xl:justify-between"
          >
            <div className="max-w-2xl text-sm leading-7 text-muted-foreground">
              {copy.integrations.title}
            </div>
            <div className="flex flex-wrap gap-3">
              {copy.integrations.items.map((item, index) => (
                <div
                  key={item}
                  className={`rounded-full border px-4 py-2 text-sm ${
                    index % 3 === 0
                      ? "border-[#8eb4da]/25 bg-[#8eb4da]/12"
                      : index % 3 === 1
                        ? "border-white/10 bg-black/20"
                        : "border-[#b18b5f]/25 bg-[#b18b5f]/12"
                  }`}
                >
                  {item}
                </div>
              ))}
            </div>
          </motion.section>

          <motion.section {...reveal} id="workflow" className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="max-w-xl">
              <div className="text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">
                {copy.workflow.eyebrow}
              </div>
              <h3 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl lg:text-[3.1rem]">
                {copy.workflow.title}
              </h3>
              <p className="mt-5 text-base leading-8 text-muted-foreground">
                {copy.workflow.body}
              </p>
            </div>

            <div className="grid gap-0 border-y border-[color:var(--border-subtle)]">
              {copy.workflow.steps.map(([step, title]) => (
                <div
                  key={step}
                  className="grid gap-4 border-b border-[color:var(--border-subtle)] py-6 last:border-b-0 md:grid-cols-[100px_1fr]"
                >
                  <div className="text-[0.72rem] uppercase tracking-[0.22em] text-muted-foreground">
                    {step}
                  </div>
                  <div className="text-2xl font-medium tracking-tight text-foreground">{title}</div>
                </div>
              ))}
            </div>
          </motion.section>

          <motion.section
            {...reveal}
            id="compare"
            className="grid gap-10 rounded-[40px] bg-[linear-gradient(180deg,rgba(247,244,239,0.98),rgba(243,238,230,0.94))] px-6 py-10 text-slate-900 shadow-xl shadow-black/10 lg:grid-cols-[0.85fr_1.15fr] lg:px-10 lg:py-12"
          >
            <div className="flex flex-col justify-between gap-6">
              <div>
                <div className="text-[0.68rem] uppercase tracking-[0.22em] text-slate-500">
                  {copy.comparison.eyebrow}
                </div>
                <h3 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl lg:text-[3.1rem]">
                  {copy.comparison.title}
                </h3>
                <p className="mt-5 max-w-xl text-base leading-8 text-slate-600">
                  {copy.comparison.body}
                </p>
              </div>

              <div className="grid gap-3">
                {copy.comparison.bullets.map((item) => (
                  <div
                    key={item}
                    className="rounded-[22px] border border-slate-200 bg-white/80 px-4 py-4 text-sm text-slate-700"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-5">
              <div className="grid gap-5 md:grid-cols-2">
                <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white">
                  <div className="border-b border-slate-200 px-5 py-4 text-sm font-medium">
                    {copy.comparison.before}
                  </div>
                  <div className="relative h-[24rem]">
                    <Image
                      src="/test-render.png"
                      alt={copy.comparison.before}
                      fill
                      sizes="(min-width: 1280px) 26vw, 90vw"
                      className="object-cover"
                    />
                  </div>
                </div>

                <div className="overflow-hidden rounded-[32px] border border-[#a98e6d]/40 bg-white shadow-lg shadow-[#a98e6d]/10">
                  <div className="border-b border-slate-200 px-5 py-4 text-sm font-medium">
                    {copy.comparison.after}
                  </div>
                  <div className="relative h-[24rem]">
                    <Image
                      src="/test-render.png"
                      alt={copy.comparison.after}
                      fill
                      sizes="(min-width: 1280px) 26vw, 90vw"
                      className="object-cover contrast-110 saturate-[1.2] sepia-[0.14]"
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {[
                  ["Geometry", "Locked"],
                  ["Camera", "Locked"],
                  ["Realism", "Enhanced"],
                ].map(([label, value], index) => (
                  <div
                    key={label}
                    className={`rounded-[24px] px-5 py-5 ${
                      index === 2
                        ? "bg-[linear-gradient(180deg,rgba(177,139,95,0.18),rgba(177,139,95,0.08))]"
                        : "bg-white/85"
                    }`}
                  >
                    <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</div>
                    <div className="mt-3 text-lg font-medium text-slate-900">{value}</div>
                  </div>
                ))}
              </div>
            </div>
          </motion.section>

          <motion.section {...reveal} id="preview" className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div className="max-w-xl">
              <div className="text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">
                {copy.preview.eyebrow}
              </div>
              <h3 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl lg:text-[3rem]">
                {copy.preview.title}
              </h3>
              <p className="mt-5 text-base leading-8 text-muted-foreground">{copy.preview.body}</p>
              <div className="mt-6">
                <Link href="/preview" className={buttonVariants({ variant: "default", size: "lg" })}>
                  {copy.preview.cta}
                  <ArrowRight data-icon="inline-end" />
                </Link>
              </div>
            </div>

            <div className="overflow-hidden rounded-[38px] border border-white/10 bg-[linear-gradient(180deg,rgba(12,16,24,0.98),rgba(20,26,36,0.95))] p-5 shadow-2xl shadow-black/20">
              <div className="flex flex-wrap gap-3 border-b border-white/10 pb-4">
                {copy.preview.items.map((item, index) => (
                  <div
                    key={item}
                    className={`rounded-full px-4 py-2 text-sm ${
                      index === 2
                        ? "bg-[#8eb4da] text-slate-950"
                        : "border border-white/10 bg-white/5 text-zinc-200"
                    }`}
                  >
                    {item}
                  </div>
                ))}
              </div>

              <div className="mt-5 grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
                <div className="overflow-hidden rounded-[28px] border border-white/10">
                  <div className="border-b border-white/10 px-4 py-3 text-sm text-zinc-300">
                    {copy.preview.panelTitle}
                  </div>
                  <div className="grid gap-3 p-3 md:grid-cols-2">
                    <div className="relative h-[15rem] overflow-hidden rounded-[20px] border border-white/10">
                      <Image
                        src="/test-render.png"
                        alt="Preview original"
                        fill
                        sizes="(min-width: 1280px) 18vw, 90vw"
                        className="object-cover"
                      />
                    </div>
                    <div className="relative h-[15rem] overflow-hidden rounded-[20px] border border-[#8c6c49]/30">
                      <Image
                        src="/test-render.png"
                        alt="Preview enhanced"
                        fill
                        sizes="(min-width: 1280px) 18vw, 90vw"
                        className="object-cover contrast-110 saturate-[1.2] sepia-[0.12]"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col justify-end gap-3">
                  {copy.why.items.map(([title]) => (
                    <div key={title} className="border-b border-white/10 pb-3 text-sm text-zinc-300 last:border-b-0 last:pb-0">
                      {title}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.section>

          <motion.section {...reveal} className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="max-w-2xl">
              <div className="text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">
                {copy.why.eyebrow}
              </div>
              <h3 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl lg:text-[3rem]">
                {copy.why.title}
              </h3>
            </div>

            <div className="grid gap-6">
              {copy.why.items.map(([title, body]) => (
                <div
                  key={title}
                  className="grid gap-3 border-b border-[color:var(--border-subtle)] pb-6 last:border-b-0 last:pb-0"
                >
                  <div className="text-xl font-medium text-foreground">{title}</div>
                  <div className="max-w-2xl text-base leading-8 text-muted-foreground">{body}</div>
                </div>
              ))}
            </div>
          </motion.section>

          <motion.section {...reveal} id="pricing" className="grid gap-8">
            <div className="max-w-3xl">
              <div className="text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">
                {copy.pricing.eyebrow}
              </div>
              <h3 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl lg:text-[3rem]">
                {copy.pricing.title}
              </h3>
              <p className="mt-5 max-w-2xl text-base leading-8 text-muted-foreground">
                {copy.pricing.body}
              </p>
            </div>

            <div className="grid gap-5 xl:grid-cols-3">
              {copy.pricing.plans.map((plan) => {
                const isHighlighted =
                  plan.name.toLowerCase() === getPricingHighlightTier();

                return (
                  <motion.div
                    key={plan.name}
                    initial={{ opacity: 0, y: 28 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.55 }}
                    viewport={{ once: true, amount: 0.15 }}
                    className={isHighlighted ? "xl:-translate-y-4" : ""}
                  >
                    <div
                      className={`flex h-full flex-col rounded-[36px] border px-6 py-6 ${
                        isHighlighted
                          ? "border-[#8eb4da]/35 bg-[linear-gradient(180deg,rgba(20,30,45,0.98),rgba(40,53,72,0.96))] shadow-2xl shadow-[#8eb4da]/10 ring-2 ring-[#8eb4da]/18"
                          : plan.name === "Enterprise"
                            ? "border-[#b18b5f]/25 bg-[linear-gradient(180deg,rgba(42,31,22,0.55),rgba(255,255,255,0.04))]"
                            : "border-white/10 bg-white/5"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className={`text-sm ${isHighlighted ? "text-zinc-300" : "text-muted-foreground"}`}>
                          {plan.name}
                        </div>
                        {isHighlighted ? (
                          <Badge className="bg-[#8eb4da] text-slate-950">
                            {copy.pricing.highlightLabel}
                          </Badge>
                        ) : null}
                      </div>

                      <div className={`mt-6 text-5xl font-semibold tracking-tight ${isHighlighted ? "text-white" : "text-foreground"}`}>
                        {plan.price}
                      </div>
                      <p className={`mt-5 text-base leading-8 ${isHighlighted ? "text-zinc-300" : "text-muted-foreground"}`}>
                        {plan.description}
                      </p>

                      <div className="mt-8 grid gap-3">
                        {plan.bullets.map((bullet) => (
                          <div
                            key={bullet}
                            className={`rounded-[22px] border px-4 py-4 text-sm ${
                              isHighlighted
                                ? "border-white/10 bg-white/8 text-zinc-100"
                                : "border-white/10 bg-black/15 text-zinc-300"
                            }`}
                          >
                            {bullet}
                          </div>
                        ))}
                      </div>

                      <div className="mt-8">
                        <Link
                          href={plan.name === "Starter" ? "/register" : plan.name === "Studio" ? "/preview" : "/login"}
                          className={buttonVariants({
                            variant: isHighlighted ? "default" : "outline",
                            size: "lg",
                            className: "w-full",
                          })}
                        >
                          {plan.cta}
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.section>

          <motion.section {...reveal} id="faq" className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
            <div className="max-w-2xl">
              <div className="text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">
                {copy.faq.eyebrow}
              </div>
              <h3 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl lg:text-[3rem]">
                {copy.faq.title}
              </h3>
            </div>

            <div className="grid gap-4">
              {copy.faq.items.map(([question, answer]) => (
                <details
                  key={question}
                  className="group border-b border-[color:var(--border-subtle)] pb-5 open:pb-7"
                >
                  <summary className="cursor-pointer list-none text-lg font-medium text-foreground">
                    {question}
                  </summary>
                  <p className="mt-4 max-w-3xl text-sm leading-8 text-muted-foreground">{answer}</p>
                </details>
              ))}
            </div>
          </motion.section>

          <motion.section
            {...reveal}
            className="overflow-hidden rounded-[44px] border border-white/10 bg-[linear-gradient(180deg,rgba(21,28,40,0.98),rgba(14,18,28,0.96))] px-6 py-12 shadow-2xl shadow-black/25 lg:px-10"
          >
            <div className="grid gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-end">
              <div className="max-w-3xl">
                <Badge variant="secondary" className="mb-4 bg-white/10 text-white">
                  Render2Real Pro
                </Badge>
                <h3 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-[3.3rem]">
                  {copy.final.title}
                </h3>
                <p className="mt-5 max-w-2xl text-base leading-8 text-zinc-300">
                  {copy.final.body}
                </p>
              </div>

              <div className="flex flex-wrap gap-3 lg:justify-end">
                <Link href="/register" className={buttonVariants({ variant: "default", size: "lg" })}>
                  {copy.final.primary}
                </Link>
                <Link href="/preview" className={buttonVariants({ variant: "outline", size: "lg" })}>
                  {copy.final.secondary}
                  <ArrowRight data-icon="inline-end" />
                </Link>
              </div>
            </div>
          </motion.section>
        </div>
      </main>

      {showBackToTop ? (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/55 px-4 py-3 text-sm text-white shadow-2xl backdrop-blur-xl transition hover:bg-black/70"
        >
          <ChevronUp className="size-4" />
          {copy.backToTop}
        </button>
      ) : null}
    </div>
  );
}
