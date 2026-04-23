"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion, useInView, useMotionValue, useSpring } from "framer-motion";
import {
  ArrowRight,
  ChevronUp,
  Languages,
  ShieldCheck,
  Layers,
  Zap,
  Lock,
  BarChart3,
  GitBranch,
  Download,
  Eye,
  CheckCircle2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppPreferencesStore } from "@/store/app-preferences";

// ─── reveal animation preset ─────────────────────────────────────────────────
const reveal = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.55, ease: "easeOut" as const },
};

const stagger = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-40px" },
  transition: { duration: 0.45, ease: "easeOut" as const },
};

// ─── animated counter ─────────────────────────────────────────────────────────
function AnimatedNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionVal = useMotionValue(0);
  const spring = useSpring(motionVal, { stiffness: 60, damping: 18 });
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (inView) motionVal.set(value);
  }, [inView, motionVal, value]);

  useEffect(() => {
    return spring.on("change", (v) => {
      if (ref.current) ref.current.textContent = Math.round(v).toLocaleString() + suffix;
    });
  }, [spring, suffix]);

  return <span ref={ref}>0{suffix}</span>;
}

// ─── before/after comparison slider ──────────────────────────────────────────
function CompareSlider({ before, after, beforeLabel, afterLabel }: {
  before: string; after: string; beforeLabel: string; afterLabel: string;
}) {
  const [pos, setPos] = useState(48);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const update = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pct = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
    setPos(pct);
  };

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full cursor-col-resize select-none overflow-hidden rounded-[32px] border border-white/10"
      onMouseDown={(e) => { isDragging.current = true; update(e.clientX); }}
      onMouseMove={(e) => { if (isDragging.current) update(e.clientX); }}
      onMouseUp={() => { isDragging.current = false; }}
      onMouseLeave={() => { isDragging.current = false; }}
      onTouchStart={(e) => { isDragging.current = true; update(e.touches[0].clientX); }}
      onTouchMove={(e) => { if (isDragging.current) update(e.touches[0].clientX); }}
      onTouchEnd={() => { isDragging.current = false; }}
    >
      {/* After (right side — base) */}
      <div className="absolute inset-0">
        <Image src={after} alt={afterLabel} fill unoptimized className="object-cover" />
        <div className="absolute bottom-3 right-3 rounded-full border border-white/20 bg-black/60 px-3 py-1 text-[0.65rem] uppercase tracking-[0.2em] text-white backdrop-blur-sm">
          {afterLabel}
        </div>
      </div>

      {/* Before (left side — clip) */}
      <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        <Image src={before} alt={beforeLabel} fill unoptimized className="object-cover" />
        <div className="absolute bottom-3 left-3 rounded-full border border-white/20 bg-black/60 px-3 py-1 text-[0.65rem] uppercase tracking-[0.2em] text-white backdrop-blur-sm">
          {beforeLabel}
        </div>
      </div>

      {/* Divider line */}
      <div
        className="absolute inset-y-0 z-10 w-px bg-white/80"
        style={{ left: `${pos}%` }}
      />

      {/* Drag handle */}
      <div
        className="absolute top-1/2 z-20 -translate-x-1/2 -translate-y-1/2"
        style={{ left: `${pos}%` }}
      >
        <div className="flex size-10 items-center justify-center rounded-full border border-white/30 bg-white/15 shadow-xl backdrop-blur-md">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M6 4L2 9L6 14M12 4L16 9L12 14" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
    </div>
  );
}

// ─── content ─────────────────────────────────────────────────────────────────
const content = {
  en: {
    nav: {
      workflow: "Workflow",
      compare: "Compare",
      preview: "Preview",
      pricing: "Pricing",
      faq: "FAQ",
      signIn: "Sign in",
      create: "Get started",
    },
    hero: {
      eyebrow: "Architectural Realism Enhancement",
      badge: "B2B · Review-safe · Local-first",
      title: "The design stays\nunchanged.\nOnly the realism\nincreases.",
      body: "Render2Real Pro transforms approved architectural renders into photoreal delivery assets — preserving exact geometry, camera angle, and scene layout. Built for architects, engineers, and visualization studios.",
      primaryCta: "Create free account",
      secondaryCta: "Explore preview",
      original: "Original render",
      output: "AI-enhanced result",
      bullets: [
        "Exact camera angle preserved",
        "Exact geometry & massing preserved",
        "No redesign, no hallucinated objects",
      ],
    },
    stats: [
      { value: 100, suffix: "%", label: "Geometry preserved" },
      { value: 0, suffix: "", label: "Redesign. Ever." },
      { value: 4, suffix: " steps", label: "From render to delivery" },
      { value: 7, suffix: " presets", label: "Material categories" },
    ],
    integrations: {
      title: "Fits into the tools architecture teams already use.",
      items: ["Revit", "Archicad", "SketchUp", "3ds Max", "Blender", "REST API"],
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
    features: {
      eyebrow: "Capabilities",
      title: "Everything a studio needs. Nothing it doesn't.",
      items: [
        {
          icon: Layers,
          title: "Preset-driven workflow",
          body: "7 material presets — brick, concrete, glass, wood, metal, roof, asphalt — each tuned for architectural fidelity.",
          accent: "blue",
        },
        {
          icon: Lock,
          title: "Geometry lock",
          body: "Strict preservation rules baked into every generation. Camera, massing, facade rhythm, and site layout are invariants.",
          accent: "green",
        },
        {
          icon: Eye,
          title: "Click-to-texture targeting",
          body: "Click any surface on the image to select it and apply a material preset. Powered by inpainting with geometry preservation.",
          accent: "purple",
        },
        {
          icon: GitBranch,
          title: "Version history",
          body: "Every generation is tracked. Compare original, realism pass, and texture pass side by side at any time.",
          accent: "amber",
        },
        {
          icon: BarChart3,
          title: "Generation analytics",
          body: "Processing times, provider usage, success rates, and preset distribution — all in one dashboard.",
          accent: "cyan",
        },
        {
          icon: Download,
          title: "Flexible export",
          body: "Export locally, to cloud destinations, or via REST API. Designed for studio-scale delivery pipelines.",
          accent: "blue",
        },
      ],
    },
    workflow: {
      eyebrow: "Workflow",
      title: "A controlled sequence built for review-safe image delivery.",
      body: "The workflow is structured around preservation first, then realism refinement. Every step exists to improve believability without changing the approved architectural decision.",
      steps: [
        { num: "01", title: "Upload the approved render", body: "Drag and drop PNG, JPG, or WEBP files into a project workspace. Files are stored locally and tracked in project history." },
        { num: "02", title: "Apply a realism preset", body: "Choose from 7 material presets or fine-tune individual sliders for reflection, weathering, shadow strength, and ambient occlusion." },
        { num: "03", title: "Generate without redesign", body: "The AI enhances realism through material fidelity, reflections, and shadows only. Composition, geometry, and camera are locked." },
        { num: "04", title: "Compare and export", body: "Use the side-by-side or slider comparison to validate the result, then export to local storage or cloud destinations." },
      ],
    },
    comparison: {
      eyebrow: "Comparison showcase",
      title: "Photoreal refinement without changing the architectural decision.",
      body: "Materials feel richer, reflections more disciplined, shadows more believable — while the building, site, and camera remain fixed.",
      bullets: [
        "Facade rhythm and proportions remain intact",
        "Roads, rails, vehicles, and site placement remain fixed",
        "The result stays suitable for review and presentation",
      ],
      before: "Before",
      after: "After",
    },
    why: {
      eyebrow: "Why it is different",
      title: "Not a generic AI image generator. A realism enhancement product for architecture.",
      items: [
        ["Built for architectural fidelity", "Camera, massing, facade rhythm, and scene composition are treated as invariants, not suggestions."],
        ["Optimized for engineering review", "The product emphasizes side-by-side validation and version tracking instead of opaque image prompts."],
        ["Ready for real studio workflows", "Projects, profiles, compare mode, export destinations, and admin readiness support a scalable SaaS direction."],
      ],
    },
    pricing: {
      eyebrow: "Pricing",
      title: "Structured for pilot adoption now, scalable studio rollout later.",
      body: "Start with a free local pilot profile, then scale into the studio workflow most firms will actually want to standardize on.",
      highlightLabel: "Best value",
      plans: [
        {
          name: "Starter",
          price: "Free",
          period: "",
          description: "For pilot users validating the workflow on real architectural renders.",
          bullets: ["Single-user local profile", "Project workspace and compare mode", "Local export and version history"],
          cta: "Start free",
          highlighted: false,
        },
        {
          name: "Studio",
          price: "Custom",
          period: "",
          description: "For architecture studios and engineering offices processing client-ready imagery at scale.",
          bullets: ["Shared presets and batch-oriented workflow", "Cloud and email delivery destinations", "Stronger project management and operator clarity"],
          cta: "Join Studio waitlist",
          highlighted: true,
        },
        {
          name: "Enterprise",
          price: "Custom",
          period: "",
          description: "For firms standardizing realism enhancement across departments, projects, and governance layers.",
          bullets: ["Admin and governance controls", "Provider policy and integration management", "Structured onboarding and rollout support"],
          cta: "Request enterprise demo",
          highlighted: false,
        },
      ],
    },
    faq: {
      eyebrow: "FAQ",
      title: "Questions architecture teams usually ask first.",
      items: [
        ["Does the software redesign the building?", "No. The product is explicitly built around realism enhancement while preserving the approved architectural composition, geometry, and scene logic."],
        ["Can this replace final archviz retouching entirely?", "Not always. For some projects it can dramatically reduce the amount of manual post-processing, but the real value is faster delivery-ready realism without losing design control."],
        ["Is this already a cloud SaaS?", "The current phase is local-first, but profiles, preview flow, admin readiness, and export destination design are being shaped toward SaaS rollout."],
        ["Who is the ideal user?", "Architects, engineers, visualization teams, and studios that care more about preserving the design than generating creative variations."],
      ],
    },
    final: {
      title: "Preserve the design intent.\nDeliver the image with higher realism.",
      body: "Created for architecture and engineering teams that need image quality to improve without sacrificing trust in what the render actually represents.",
      primary: "Create free account",
      secondary: "Explore product preview",
    },
    backToTop: "Back to top",
  },
  hu: {
    nav: {
      workflow: "Workflow",
      compare: "Összehasonlítás",
      preview: "Előnézet",
      pricing: "Csomagok",
      faq: "GYIK",
      signIn: "Belépés",
      create: "Kezdés",
    },
    hero: {
      eyebrow: "Építészeti Realizmusnövelés",
      badge: "B2B · Review-safe · Helyi-first",
      title: "A terv változatlan\nmarad.\nCsak a realizmus\nnő.",
      body: "A Render2Real Pro jóváhagyott építészeti renderekből fotórealisztikus, átadásra kész képeket készít — megőrizve a pontos geometriát, kameraállást és jelenet-elrendezést. Építészeknek, mérnököknek és látványtervező stúdióknak.",
      primaryCta: "Ingyenes fiók létrehozása",
      secondaryCta: "Termékbemutató",
      original: "Eredeti render",
      output: "AI-javított eredmény",
      bullets: [
        "Pontos kameraállás megőrzve",
        "Pontos geometria és tömegformálás megőrzve",
        "Nincs újratervezés, nincsenek hallucinált elemek",
      ],
    },
    stats: [
      { value: 100, suffix: "%", label: "Geometria megőrzve" },
      { value: 0, suffix: "", label: "Újratervezés. Soha." },
      { value: 4, suffix: " lépés", label: "Rendertől az átadásig" },
      { value: 7, suffix: " preset", label: "Anyagkategória" },
    ],
    integrations: {
      title: "Illeszkedik azokhoz az eszközökhöz, amelyeket az építészeti csapatok már ma is használnak.",
      items: ["Revit", "Archicad", "SketchUp", "3ds Max", "Blender", "REST API"],
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
    features: {
      eyebrow: "Képességek",
      title: "Minden, amire egy stúdiónak szüksége van. Semmi más.",
      items: [
        {
          icon: Layers,
          title: "Preset-vezérelt workflow",
          body: "7 anyagpreset — tégla, beton, üveg, fa, fém, tető, aszfalt — mindegyik az építészeti hűségre hangolva.",
          accent: "blue",
        },
        {
          icon: Lock,
          title: "Geometriai zár",
          body: "Szigorú megőrzési szabályok minden generálásba beépítve. A kamera, a tömegformálás és a helyszín invariáns.",
          accent: "green",
        },
        {
          icon: Eye,
          title: "Kattintásos textúra-célzás",
          body: "Kattints bármely felületre a képen, válaszd ki és alkalmazz anyagpresetet. Inpainting geometria-megőrzéssel.",
          accent: "purple",
        },
        {
          icon: GitBranch,
          title: "Verzióelőzmény",
          body: "Minden generálás nyomon követhető. Hasonlítsd össze az eredetit, a realizmus-passzt és a textúra-passzt bármikor.",
          accent: "amber",
        },
        {
          icon: BarChart3,
          title: "Generálási analitika",
          body: "Feldolgozási idők, provider-használat, sikerességi arányok és preset-eloszlás — egy dashboardon.",
          accent: "cyan",
        },
        {
          icon: Download,
          title: "Rugalmas export",
          body: "Exportálj helyileg, felhőbe vagy REST API-n keresztül. Stúdiószintű kézbesítési pipeline-okhoz tervezve.",
          accent: "blue",
        },
      ],
    },
    workflow: {
      eyebrow: "Workflow",
      title: "Kontrollált folyamat review-biztos képi átadáshoz.",
      body: "A workflow először a megőrzésre, utána a realizmus finomítására épül. Minden lépés azért van, hogy javuljon a hihetőség anélkül, hogy megváltozna a jóváhagyott építészeti döntés.",
      steps: [
        { num: "01", title: "Jóváhagyott render feltöltése", body: "Húzd be a PNG, JPG vagy WEBP fájlokat a projekt workspace-be. A fájlok helyben tárolódnak és nyomon követhetők." },
        { num: "02", title: "Realizmus preset kiválasztása", body: "Válassz 7 anyagpreset közül, vagy finomhangold a reflexió, kopás, árnyékerő és ambient occlusion csúszkákat." },
        { num: "03", title: "Generálás újratervezés nélkül", body: "Az AI csak anyaghűségen, reflexiókon és árnyékokon keresztül javítja a realizmust. A kompozíció, a geometria és a kamera zárolva van." },
        { num: "04", title: "Összehasonlítás és export", body: "Használd az egymás melletti vagy csúszkás összehasonlítást az eredmény validálásához, majd exportálj helyi tárolóba vagy felhőbe." },
      ],
    },
    comparison: {
      eyebrow: "Összehasonlítás",
      title: "Fotórealisztikus finomítás az építészeti döntés megváltoztatása nélkül.",
      body: "Az anyagok gazdagabbnak, a reflexiók fegyelmezettebbnek, az árnyékok hihetőbbnek tűnnek — miközben az épület, a helyszín és a kamera változatlan marad.",
      bullets: [
        "A homlokzati ritmus és arányok változatlanok maradnak",
        "Az utak, sínek, járművek és helyszíni elemek pozíciója rögzített",
        "Az eredmény review-ra és prezentációra is alkalmas marad",
      ],
      before: "Előtte",
      after: "Utána",
    },
    why: {
      eyebrow: "Miért más",
      title: "Nem általános AI képgenerátor. Hanem építészeti realizmusnövelő termék.",
      items: [
        ["Építészeti hűségre tervezve", "A kamera, a tömegformálás, a homlokzati ritmus és a jelenet kompozíciója itt nem javaslat, hanem invariáns."],
        ["Mérnöki review-ra optimalizálva", "A termék az egymás melletti ellenőrzést és a verziókövetést hangsúlyozza, nem az átláthatatlan promptolást."],
        ["Valódi stúdió workflow-hoz készítve", "Projektkezelés, profilok, compare mód, export célok és admin readiness támogatja a skálázható SaaS irányt."],
      ],
    },
    pricing: {
      eyebrow: "Csomagok",
      title: "Ma pilot használatra, később stúdiószintű skálázásra kialakítva.",
      body: "Kezdj egy ingyenes helyi pilot profillal, majd lépj tovább abba a stúdió workflow-ba, amelyet a legtöbb iroda valóban standardizálni akar majd.",
      highlightLabel: "Legjobb érték",
      plans: [
        {
          name: "Starter",
          price: "Ingyenes",
          period: "",
          description: "Pilot felhasználóknak, akik valós építészeti rendereken validálják a workflow-t.",
          bullets: ["Egyfelhasználós helyi profil", "Projekt workspace és compare mód", "Helyi export és verzióelőzmény"],
          cta: "Kezdés ingyen",
          highlighted: false,
        },
        {
          name: "Studio",
          price: "Egyedi",
          period: "",
          description: "Építészeti stúdióknak és mérnökirodáknak, akik ügyfélkész vizuálokat dolgoznak fel nagyobb mennyiségben.",
          bullets: ["Megosztott presetek és batch-orientált workflow", "Felhő- és email-alapú kézbesítési célok", "Erősebb projektkezelés és operátori átláthatóság"],
          cta: "Studio várólista",
          highlighted: true,
        },
        {
          name: "Enterprise",
          price: "Egyedi",
          period: "",
          description: "Olyan cégeknek, akik osztályok, projektek és governance rétegek között standardizálnák a realizmusnövelést.",
          bullets: ["Admin és governance kontrollok", "Provider policy és integrációkezelés", "Strukturált onboarding és bevezetés"],
          cta: "Enterprise demo kérése",
          highlighted: false,
        },
      ],
    },
    faq: {
      eyebrow: "GYIK",
      title: "A kérdések, amelyeket az építészeti csapatok először feltesznek.",
      items: [
        ["Újratervezi a szoftver az épületet?", "Nem. A termék kifejezetten a realizmusnövelésre épül, miközben megőrzi a jóváhagyott építészeti kompozíciót, geometriát és jelenet-logikát."],
        ["Kiválthatja ez a végső archviz retusálást?", "Nem mindig. Egyes projekteknél drasztikusan csökkenti a manuális utómunka mennyiségét, de az igazi érték az, hogy gyorsabb az átadásra kész realizmus a tervezési kontroll elvesztése nélkül."],
        ["Ez már felhőalapú SaaS?", "A jelenlegi fázis helyi-first, de a profilok, az előnézeti folyamat, az admin readiness és az export célok tervezése a SaaS bevezetés felé halad."],
        ["Ki az ideális felhasználó?", "Építészek, mérnökök, látványtervező csapatok és stúdiók, akik jobban törődnek a terv megőrzésével, mint a kreatív variációk generálásával."],
      ],
    },
    final: {
      title: "Őrizd meg a tervezési szándékot.\nKézbesítsd a képet magasabb realizmussal.",
      body: "Olyan építészeti és mérnöki csapatoknak készült, amelyeknek a képminőségnek javulnia kell anélkül, hogy elveszítenék a bizalmat abban, amit a render valójában ábrázol.",
      primary: "Ingyenes fiók létrehozása",
      secondary: "Termékbemutató megnyitása",
    },
    backToTop: "Vissza a tetejére",
  },
};

const accentColors: Record<string, string> = {
  blue: "from-blue-500/20 to-blue-600/5 border-blue-500/20 text-blue-400",
  green: "from-emerald-500/20 to-emerald-600/5 border-emerald-500/20 text-emerald-400",
  purple: "from-purple-500/20 to-purple-600/5 border-purple-500/20 text-purple-400",
  amber: "from-amber-500/20 to-amber-600/5 border-amber-500/20 text-amber-400",
  cyan: "from-cyan-500/20 to-cyan-600/5 border-cyan-500/20 text-cyan-400",
};

export function getPricingHighlightTier() {
  return "studio" as const;
}

export function LandingView() {
  const language = useAppPreferencesStore((state) => state.language);
  const setLanguage = useAppPreferencesStore((state) => state.setLanguage);
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
      {/* ── NAV ─────────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-white/8 bg-background/75 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[1680px] items-center justify-between gap-4 px-6 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="relative size-9 overflow-hidden rounded-xl">
              <Image src="/logo.png" alt="Render2Real Pro" fill unoptimized className="object-cover" />
            </div>
            <span className="font-heading text-[0.95rem] font-semibold tracking-tight">
              Render2Real Pro
            </span>
          </div>

          <nav className="hidden items-center gap-6 text-sm text-muted-foreground xl:flex">
            {[
              ["#workflow", copy.nav.workflow],
              ["#compare", copy.nav.compare],
              ["#preview", copy.nav.preview],
              ["#pricing", copy.nav.pricing],
              ["#faq", copy.nav.faq],
            ].map(([href, label]) => (
              <a key={href} href={href} className="transition hover:text-foreground">
                {label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link href="/login" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              {copy.nav.signIn}
            </Link>
            <Link href="/register" className={buttonVariants({ variant: "default", size: "sm" })}>
              {language === "hu" ? "Ingyenes fiók létrehozása" : "Create free account"}
              <ArrowRight data-icon="inline-end" />
            </Link>
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
          </div>
        </div>
      </header>

      <main className="pb-16">
        {/* ── HERO ──────────────────────────────────────────────────────────── */}
        <section className="relative isolate overflow-hidden border-b border-white/8">
          {/* Background */}
          <div className="absolute inset-0 bg-[#080b12]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:72px_72px]" />
          <div className="absolute left-[-15%] top-[-10rem] size-[50rem] rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.22),transparent_60%)] blur-3xl" />
          <div className="absolute bottom-[-14rem] right-[-10%] size-[40rem] rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.14),transparent_60%)] blur-3xl" />

          <div className="relative mx-auto grid min-h-[calc(100svh-60px)] w-full max-w-[1840px] gap-10 px-4 py-12 md:px-6 lg:grid-cols-[0.65fr_1.35fr] lg:items-center lg:px-10 lg:py-16">
            {/* Left — copy */}
            <motion.div {...reveal} className="flex flex-col gap-7">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="border-blue-500/30 bg-blue-500/10 text-blue-300">
                  {copy.hero.eyebrow}
                </Badge>
                <Badge variant="outline" className="border-white/15 text-zinc-400">
                  {copy.hero.badge}
                </Badge>
              </div>

              <h2 className="whitespace-pre-line text-[2.6rem] font-semibold leading-[1.0] tracking-[-0.04em] text-white sm:text-[3.5rem] xl:text-[4.5rem]">
                {copy.hero.title}
              </h2>

              <p className="max-w-lg text-base leading-8 text-zinc-400 lg:text-lg">
                {copy.hero.body}
              </p>

              <div className="flex flex-wrap gap-3">
                <Link href="/register" className={buttonVariants({ variant: "default", size: "lg" })}>
                  {copy.hero.primaryCta}
                  <ArrowRight data-icon="inline-end" />
                </Link>
                <Link href="/preview" className={buttonVariants({ variant: "outline", size: "lg" })}>
                  {copy.hero.secondaryCta}
                </Link>
              </div>

              <div className="grid gap-2.5">
                {copy.hero.bullets.map((item) => (
                  <div key={item} className="flex items-center gap-3 text-sm text-zinc-300">
                    <CheckCircle2 className="size-4 shrink-0 text-blue-400" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Right — comparison slider */}
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.15, ease: "easeOut" }}
              className="relative"
            >
              <div className="relative h-[420px] w-full overflow-hidden rounded-[36px] border border-white/10 shadow-2xl shadow-black/50 sm:h-[520px] xl:h-[600px]">
                <CompareSlider
                  before="/hero-render-before.png"
                  after="/hero-render-after.png"
                  beforeLabel={copy.hero.original}
                  afterLabel={copy.hero.output}
                />
              </div>
              {/* Floating badge */}
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2">
                <div className="flex items-center gap-2 rounded-full border border-white/15 bg-black/70 px-4 py-2 text-xs text-zinc-300 shadow-xl backdrop-blur-xl">
                  <div className="size-1.5 animate-pulse rounded-full bg-blue-400" />
                  Drag to compare · AI-enhanced result
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── STATS BAR ─────────────────────────────────────────────────────── */}
        <motion.section
          {...reveal}
          className="border-b border-white/8 bg-[#0a0d14]"
        >
          <div className="mx-auto grid w-full max-w-[1680px] grid-cols-2 divide-x divide-white/8 px-6 lg:grid-cols-4">
            {copy.stats.map((stat) => (
              <div key={stat.label} className="flex flex-col items-center gap-1 px-6 py-8 text-center">
                <div className="font-mono text-3xl font-semibold tracking-tight text-white lg:text-4xl">
                  <AnimatedNumber value={stat.value} suffix={stat.suffix} />
                </div>
                <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </motion.section>

        <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-24 px-4 pt-16 md:px-6 lg:gap-32 lg:pt-24">

          {/* ── INTEGRATIONS ──────────────────────────────────────────────── */}
          <motion.section {...reveal} className="text-center">
            <p className="text-sm text-muted-foreground">{copy.integrations.title}</p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-6">
              {[
                { src: "/logos/revit.png", alt: "Autodesk Revit" },
                { src: "/logos/archicad.png", alt: "Graphisoft Archicad" },
                { src: "/logos/sketchup.jpg", alt: "SketchUp" },
                { src: "/logos/3dsmax.png", alt: "Autodesk 3ds Max" },
                { src: "/logos/blender.png", alt: "Blender" },
              ].map((logo) => (
                <div
                  key={logo.alt}
                  className="flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-5 py-2 transition hover:bg-white/10"
                >
                  <div className="relative h-7 w-24">
                    <Image src={logo.src} alt={logo.alt} fill unoptimized className="object-contain" />
                  </div>
                </div>
              ))}
              <div className="flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-5 py-2 text-sm font-medium text-zinc-300">
                REST API
              </div>
            </div>
          </motion.section>

          {/* ── FEATURES BENTO ────────────────────────────────────────────── */}
          <motion.section {...reveal} id="features">
            <div className="mb-12 max-w-2xl">
              <div className="text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">
                {copy.features.eyebrow}
              </div>
              <h3 className="mt-4 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-[3rem]">
                {copy.features.title}
              </h3>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {copy.features.items.map((feature, i) => {
                const Icon = feature.icon;
                const colors = accentColors[feature.accent] ?? accentColors.blue;
                return (
                  <motion.div
                    key={feature.title}
                    {...stagger}
                    transition={{ duration: 0.45, delay: i * 0.07, ease: "easeOut" }}
                    className={`group relative overflow-hidden rounded-[28px] border bg-gradient-to-br p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${colors}`}
                  >
                    <div className={`mb-4 flex size-11 items-center justify-center rounded-[16px] bg-gradient-to-br ${colors} border`}>
                      <Icon className={`size-5 ${colors.split(" ").find(c => c.startsWith("text-")) ?? "text-blue-400"}`} />
                    </div>
                    <h4 className="text-base font-semibold text-foreground">{feature.title}</h4>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{feature.body}</p>
                  </motion.div>
                );
              })}
            </div>
          </motion.section>

          {/* ── TRUST RULES ───────────────────────────────────────────────── */}
          <motion.section
            {...reveal}
            className="overflow-hidden rounded-[40px] border border-white/10 bg-gradient-to-br from-[#0d1220] to-[#090c14] p-8 lg:p-12"
          >
            <div className="grid gap-10 lg:grid-cols-[1fr_1fr]">
              <div>
                <div className="text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">
                  {copy.trust.eyebrow}
                </div>
                <h3 className="mt-4 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                  {copy.trust.title}
                </h3>
              </div>
              <div className="grid gap-3">
                {copy.trust.items.map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-4 rounded-[20px] border border-white/8 bg-white/4 px-5 py-4"
                  >
                    <ShieldCheck className="size-5 shrink-0 text-blue-400" />
                    <span className="text-sm text-foreground">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.section>

          {/* ── WORKFLOW ──────────────────────────────────────────────────── */}
          <motion.section {...reveal} id="workflow">
            <div className="mb-12 grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-end">
              <div>
                <div className="text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">
                  {copy.workflow.eyebrow}
                </div>
                <h3 className="mt-4 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-[3rem]">
                  {copy.workflow.title}
                </h3>
              </div>
              <p className="text-base leading-8 text-muted-foreground lg:max-w-lg">
                {copy.workflow.body}
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {copy.workflow.steps.map((step, i) => (
                <motion.div
                  key={step.num}
                  {...stagger}
                  transition={{ duration: 0.45, delay: i * 0.09, ease: "easeOut" }}
                  className="relative rounded-[28px] border border-white/10 bg-white/4 p-6"
                >
                  {i < copy.workflow.steps.length - 1 && (
                    <div className="absolute right-0 top-[2.6rem] hidden h-px w-4 bg-white/15 lg:block" style={{ right: "-1rem" }} />
                  )}
                  <div className="font-mono text-[2.2rem] font-semibold leading-none tracking-tight text-white/15">
                    {step.num}
                  </div>
                  <h4 className="mt-4 text-base font-semibold text-foreground">{step.title}</h4>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.body}</p>
                </motion.div>
              ))}
            </div>
          </motion.section>

          {/* ── COMPARISON SHOWCASE ───────────────────────────────────────── */}
          <motion.section {...reveal} id="compare">
            <div className="mb-10 grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-end">
              <div>
                <div className="text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">
                  {copy.comparison.eyebrow}
                </div>
                <h3 className="mt-4 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-[3rem]">
                  {copy.comparison.title}
                </h3>
              </div>
              <div>
                <p className="text-base leading-8 text-muted-foreground">{copy.comparison.body}</p>
                <div className="mt-5 grid gap-2">
                  {copy.comparison.bullets.map((b) => (
                    <div key={b} className="flex items-center gap-3 text-sm text-zinc-300">
                      <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
                      <span>{b}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="relative h-[420px] overflow-hidden rounded-[36px] border border-white/10 shadow-2xl shadow-black/40 sm:h-[520px] lg:h-[640px]">
              <CompareSlider
                before="/hero-render-before.png"
                after="/hero-render-after.png"
                beforeLabel={copy.comparison.before}
                afterLabel={copy.comparison.after}
              />
            </div>
            <p className="mt-4 text-center text-xs text-zinc-600">{language === "hu" ? "Húzza a csúszkát az összehasonlításhoz" : "Drag the slider to compare"}</p>
          </motion.section>

          {/* ── WHY DIFFERENT ─────────────────────────────────────────────── */}
          <motion.section {...reveal} id="preview">
            <div className="mb-12">
              <div className="text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">
                {copy.why.eyebrow}
              </div>
              <h3 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-[3rem]">
                {copy.why.title}
              </h3>
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              {copy.why.items.map(([title, body], i) => (
                <motion.div
                  key={title}
                  {...stagger}
                  transition={{ duration: 0.45, delay: i * 0.1, ease: "easeOut" }}
                  className="rounded-[28px] border border-white/10 bg-white/4 p-7"
                >
                  <div className="mb-3 flex size-9 items-center justify-center rounded-[14px] border border-blue-500/25 bg-blue-500/10">
                    <Zap className="size-4 text-blue-400" />
                  </div>
                  <h4 className="text-base font-semibold text-foreground">{title}</h4>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
                </motion.div>
              ))}
            </div>
          </motion.section>

          {/* ── PRICING ───────────────────────────────────────────────────── */}
          <motion.section {...reveal} id="pricing">
            <div className="mb-12 text-center">
              <div className="text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">
                {copy.pricing.eyebrow}
              </div>
              <h3 className="mt-4 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-[3rem]">
                {copy.pricing.title}
              </h3>
              <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-muted-foreground">
                {copy.pricing.body}
              </p>
            </div>
            <div className="grid gap-6 lg:grid-cols-3">
              {copy.pricing.plans.map((plan, i) => (
                <motion.div
                  key={plan.name}
                  {...stagger}
                  transition={{ duration: 0.45, delay: i * 0.1, ease: "easeOut" }}
                  className={`relative overflow-hidden rounded-[32px] border p-8 ${
                    plan.highlighted
                      ? "border-blue-500/40 bg-gradient-to-b from-blue-950/60 to-[#0d1220] shadow-2xl shadow-blue-500/10"
                      : "border-white/10 bg-white/4"
                  }`}
                >
                  {plan.highlighted && (
                    <div className="absolute right-6 top-6">
                      <Badge className="border-blue-400/30 bg-blue-500/15 text-blue-300">
                        {copy.pricing.highlightLabel}
                      </Badge>
                    </div>
                  )}
                  <div className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    {plan.name}
                  </div>
                  <div className={`mt-4 text-4xl font-semibold tracking-tight ${plan.highlighted ? "text-white" : "text-foreground"}`}>
                    {plan.price}
                  </div>
                  <p className={`mt-4 text-sm leading-7 ${plan.highlighted ? "text-zinc-300" : "text-muted-foreground"}`}>
                    {plan.description}
                  </p>
                  <div className="mt-7 grid gap-2.5">
                    {plan.bullets.map((bullet) => (
                      <div
                        key={bullet}
                        className={`flex items-center gap-3 rounded-[16px] border px-4 py-3 text-sm ${
                          plan.highlighted
                            ? "border-white/10 bg-white/6 text-zinc-200"
                            : "border-white/8 bg-white/3 text-zinc-300"
                        }`}
                      >
                        <CheckCircle2 className={`size-4 shrink-0 ${plan.highlighted ? "text-blue-400" : "text-zinc-500"}`} />
                        {bullet}
                      </div>
                    ))}
                  </div>
                  <div className="mt-8">
                    <Link
                      href={plan.name === "Starter" ? "/register" : plan.name === "Studio" ? "/preview" : "/login"}
                      className={buttonVariants({
                        variant: plan.highlighted ? "default" : "outline",
                        size: "lg",
                        className: "w-full",
                      })}
                    >
                      {plan.cta}
                    </Link>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>

          {/* ── FAQ ───────────────────────────────────────────────────────── */}
          <motion.section {...reveal} id="faq" className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
            <div>
              <div className="text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">
                {copy.faq.eyebrow}
              </div>
              <h3 className="mt-4 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-[3rem]">
                {copy.faq.title}
              </h3>
            </div>
            <div className="grid gap-0">
              {copy.faq.items.map(([question, answer]) => (
                <details
                  key={question}
                  className="group border-b border-white/8 py-5 open:pb-7"
                >
                  <summary className="cursor-pointer list-none text-base font-medium text-foreground transition hover:text-white">
                    {question}
                  </summary>
                  <p className="mt-4 text-sm leading-7 text-muted-foreground">{answer}</p>
                </details>
              ))}
            </div>
          </motion.section>

          {/* ── FINAL CTA ─────────────────────────────────────────────────── */}
          <motion.section
            {...reveal}
            className="overflow-hidden rounded-[44px] border border-white/10 bg-gradient-to-br from-[#0e1525] via-[#0a0f1c] to-[#080b14] px-8 py-14 shadow-2xl shadow-black/30 lg:px-14"
          >
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(59,130,246,0.12),transparent_50%)]" />
            <div className="relative grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
              <div>
                <Badge variant="secondary" className="mb-5 bg-white/8 text-white">
                  Render2Real Pro
                </Badge>
                <h3 className="whitespace-pre-line text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-[3rem]">
                  {copy.final.title}
                </h3>
                <p className="mt-5 max-w-2xl text-base leading-8 text-zinc-400">
                  {copy.final.body}
                </p>
              </div>
              <div className="flex flex-wrap gap-3 lg:justify-end">
                <Link href="/register" className={buttonVariants({ variant: "default", size: "lg" })}>
                  {copy.final.primary}
                  <ArrowRight data-icon="inline-end" />
                </Link>
                <Link href="/preview" className={buttonVariants({ variant: "outline", size: "lg" })}>
                  {copy.final.secondary}
                </Link>
              </div>
            </div>
          </motion.section>

          {/* ── FOOTER ────────────────────────────────────────────────────── */}
          <footer className="border-t border-white/8 pb-4 pt-10">
            <div className="flex flex-col items-center justify-between gap-4 text-xs text-muted-foreground sm:flex-row">
              <div className="flex items-center gap-2">
                <div className="relative size-6 overflow-hidden rounded-md">
                  <Image src="/logo.png" alt="Render2Real Pro" fill unoptimized className="object-cover" />
                </div>
                <span>Render2Real Pro</span>
              </div>
              <div className="flex items-center gap-4">
                <Link href="/login" className="transition hover:text-foreground">{copy.nav.signIn}</Link>
                <Link href="/register" className="transition hover:text-foreground">{copy.nav.create}</Link>
              </div>
            </div>
          </footer>
        </div>
      </main>

      {/* ── BACK TO TOP ───────────────────────────────────────────────────── */}
      {showBackToTop && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/60 px-4 py-2.5 text-xs text-white shadow-2xl backdrop-blur-xl transition hover:bg-black/75"
        >
          <ChevronUp className="size-3.5" />
          {copy.backToTop}
        </button>
      )}
    </div>
  );
}
