# FormaReal (Render2Real Pro) — Teljes Körű Audit és AI-vezérelt Fejlesztési Dokumentáció

> **Készítette:** G2A Marketing — automatizált kódbázis-audit
> **Projekt:** `C:\Users\User\test_code\r2r_pro`
> **Vizsgálat dátuma:** 2026-06-08
> **Termék:** FormaReal — építészeti render realizmusnövelő SaaS (M Mérnöki Iroda Kft.)
> **Tech stack:** Next.js 16.2.4 (App Router, Turbopack) · React 19 · TypeScript · Tailwind v4 · shadcn/ui · Framer Motion · Zustand · React Query · Prisma 6 + PostgreSQL · Fal.ai (Flux ControlNet) · sharp · bcryptjs

---

## 0. Hogyan használja ezt a dokumentumot egy másik AI (Claude)

Ez **nem** prezentációs audit, hanem **végrehajtható fejlesztési terv**. A dokumentum minden megállapítása konkrét fájlhoz és kódelemhez kötött. A végrehajtó AI-nak a következő munkamenetet javasoljuk:

1. **Olvasd be** a hivatkozott fájlt a megadott elérési úttal (pl. `src/components/landing/landing-view.tsx`).
2. **Azonosítsd** a "Konkrét fejlesztői feladatok" szekcióban megnevezett blokkot/sort.
3. **Alkalmazd** a "Konkrét szövegjavaslatok" / "Konkrét UI/UX módosítások" tartalmát.
4. A feladatokat **prioritás szerint** hajtsd végre (Kritikus → Magas → Közepes → Alacsony), kivéve ha a felhasználó mást kér.
5. Minden módosítás után futtasd: `npm run lint && npm run typecheck && npm run test`.

A fájl-elérési utak a projekt gyökeréhez (`C:\Users\User\test_code\r2r_pro`) relatívak.

---

## 1. Vezetői összefoglaló (a 12 legfontosabb megállapítás)

| # | Megállapítás | Terület | Prioritás |
|---|---|---|---|
| 1 | **Márkanév-kavarodás**: README/repo = „Render2Real Pro" / `formareal`, UI = „FormaReal", eyebrow = „M Mérnöki Iroda Kft." — nincs egységes brand | Marketing/Tartalom | Kritikus |
| 2 | **Nulla SEO-infrastruktúra**: nincs `sitemap`, `robots`, Open Graph, structured data, `metadataBase`; a landing teljesen kliensoldali (`"use client"`) → gyenge indexelhetőség | SEO/Technikai | Kritikus |
| 3 | **Nincs `<h1>` a landing oldalon** — a hero cím `<h2>`, nincs valódi H1; a H-hierarchia hibás | SEO | Kritikus |
| 4 | **Brutális képméretek**: `logo.png` 4,2 MB, `hero-render-before.png` 2,75 MB, `hero-render-after.png` 2,09 MB, mind `unoptimized` → katasztrofális LCP | Technikai/Teljesítmény | Kritikus |
| 5 | **Admin jogosultság hiánya**: bármely bejelentkezett user kezelheti a preseteket (`requireAdmin()` csak TODO-t tartalmaz) | Technikai/Biztonság | Kritikus |
| 6 | **i18n inkonzisztencia**: az auth űrlap (`auth-form-card.tsx`) és sok workspace-szöveg keményen kódolt angol, miközben az app alapnyelve magyar | Tartalom/UX | Magas |
| 7 | **Árva / duplikált route-ok**: `/providers`, `/history`, `/settings`, `/projects/[id]` a navigációból elérhetetlen vagy duplikált a `/app/*` változatokkal | UX/IA/Technikai | Magas |
| 8 | **Nincs analytics/tracking**: sem GA4, sem Plausible/PostHog, sem konverziókövetés — a marketing teljesítménye mérhetetlen | Marketing/Technikai | Magas |
| 9 | **Hiányzó jogi/EU-oldalak**: nincs Adatkezelési tájékoztató, ÁSZF, Impresszum, cookie-banner — magyar/EU cégnek kötelező | Marketing/Jogi | Magas |
| 10 | **Nincs social proof**: nulla referencia, esettanulmány, ügyfél-logó, vélemény; a „stat" számok vanity-értékek (0, 100%) | Marketing/Konverzió | Magas |
| 11 | **Nincs mobil navigáció**: a landing nav `xl:flex` alatt teljesen eltűnik, nincs hamburger-menü | UI/UX | Magas |
| 12 | **Pricing CTA-k zsákutcája**: mindhárom csomag `/register`-re visz, nincs „Studio várólista" / „Enterprise demo" form | Marketing/Konverzió | Közepes |

---

## 2. Teljes Site Map (route-térkép)

### 2.1 Publikus oldalak (nincs auth)

| Route | Fájl | Komponens | Megjegyzés |
|---|---|---|---|
| `/` | `src/app/page.tsx` | `LandingView` | Marketing landing, kliensoldali |
| `/login` | `src/app/login/page.tsx` | `AuthShell mode="login"` | Bejelentkezés |
| `/register` | `src/app/register/page.tsx` | `AuthShell mode="register"` | Regisztráció |
| `/preview` | `src/app/preview/page.tsx` | `PreviewView` | Statikus „vezetett bemutató" (nincs valódi screenshot) |
| `/share/[token]` | `src/app/share/[token]/page.tsx` | `ShareView` | Nyilvános, read-only projektmegosztás |

### 2.2 Alkalmazás (auth mögött — kliensoldali guard az `AppFrame`-ben)

| Route | Fájl | Komponens | Navigációban? |
|---|---|---|---|
| `/app` | `src/app/app/page.tsx` | `DashboardView` | ✅ Dashboard |
| `/app/projects` | `src/app/app/projects/page.tsx` | `ProjectsView` | ✅ Projects |
| `/app/projects/[projectId]` | `src/app/app/projects/[projectId]/page.tsx` | `WorkspaceView` | (projekten keresztül) |
| `/app/settings` | `src/app/app/settings/page.tsx` | `SettingsView` | ✅ Settings |
| `/app/admin` | `src/app/app/admin/page.tsx` | `AdminView` | ✅ Admin (de nincs role-check!) |

### 2.3 Árva / duplikált route-ok (PROBLÉMA)

| Route | Fájl | Állapot |
|---|---|---|
| `/settings` | `src/app/settings/page.tsx` | **Duplikátum** a `/app/settings`-szel — nincs guard (nem `/app` prefixű) |
| `/providers` | `src/app/providers/page.tsx` | **Árva**: nincs a nav-ban, nincs `/app/providers`, guardolatlan |
| `/history` | `src/app/history/page.tsx` | **Árva**: README `/app/history`-t ígér, de az nem létezik; ez guardolatlan |
| `/projects/[projectId]` | `src/app/projects/[projectId]/page.tsx` | **Duplikátum** a `/app/projects/[id]`-vel |

> A README („Key routes") `/app/providers` és `/app/history` route-okat hivatkozik, amelyek **nem léteznek** — a tényleges fájlok a gyökéren (`/providers`, `/history`) vannak. A nav (`app-frame.tsx`) viszont egyiket sem tartalmazza. Ezek a felhasználó számára **elérhetetlen**, ráadásul guardolatlan oldalak.

### 2.4 API route-ok (referencia a fejlesztői feladatokhoz)

```
/api/health                                     GET    liveness
/api/auth/{login,logout,register,session}       POST/GET
/api/projects                                   GET/POST
/api/projects/[projectId]                       GET/PATCH/DELETE
/api/projects/[projectId]/share                 POST/DELETE
/api/projects/[projectId]/assets                GET/POST
/api/projects/[projectId]/assets/[assetId]      DELETE
/api/projects/[projectId]/assets/[assetId]/versions/[versionId]/restore  POST
/api/generations                                POST
/api/export                                     POST
/api/providers                                  GET
/api/logs                                        GET
/api/admin/presets, /api/admin/presets/[id]     GET/POST/PUT/DELETE  ⚠ nincs role-check
/api/images/[imageAssetId]/prompt               GET
/api/files/[...segments]                        GET    (path-traversal védett)
/api/share/[token]                              GET
/api/texture-targeting/{apply,preview,select}   POST
```

---

## 3. Globális (oldalakon átívelő) megállapítások

Ezek a problémák több oldalt érintenek; egyszer javítandók, de minden oldalon hatnak.

### 3.1 Márka- és névhasználat — KRITIKUS

**Probléma.** Három különböző név él egymás mellett:
- `package.json` → `"name": "formareal"`, `README.md` → „Render2Real Pro", `prisma`/onboarding kulcs → `render2real_onboarding_v1`
- UI (layout, landing, app-frame, preview, share) → „FormaReal"
- `i18n` eyebrow → „M Mérnöki Iroda Kft."

**Fejlesztői feladat.**
1. Dönts egységes névről (javaslat: **FormaReal**, „by M Mérnöki Iroda Kft." kísérőszöveggel).
2. Egységesítsd: `README.md`, `src/app/layout.tsx` `metadata.title`, `src/components/onboarding/onboarding-tour.tsx` `TOUR_KEY` (jelenleg `render2real_onboarding_v1`).
3. Vezess be egy konstanst: `src/config/brand.ts` → `export const BRAND = { name: "FormaReal", legalName: "M Mérnöki Iroda Kft.", domain: "..." }`, és minden helyen ezt használd a literál helyett.

### 3.2 SEO-infrastruktúra — KRITIKUS

**Probléma.** `find` szerint **nincs**: `sitemap.ts`, `robots.ts`, `manifest`, `opengraph-image`, `icon`. A `src/app/layout.tsx` metadata mindössze:
```ts
export const metadata: Metadata = {
  title: "FormaReal",
  description: "Architectural render realism enhancement without redesigning the composition.",
};
```
- `lang="hu"`, de a description **angol**.
- Nincs `metadataBase` → relatív OG/canonical URL-ek nem oldódnak fel.
- A landing (`page.tsx` → `LandingView`) `"use client"` → a teljes marketing-tartalom kliensoldalon renderelődik, gyenge a kezdeti HTML-tartalom indexelhetősége.

**Fejlesztői feladatok.**
1. **`src/app/layout.tsx`** — bővítsd a metadata-t:
```ts
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://formareal.hu"),
  title: { default: "FormaReal — Építészeti render realizmusnövelés", template: "%s · FormaReal" },
  description: "Jóváhagyott építészeti renderekből fotórealisztikus, átadásra kész képek — a geometria, kameraállás és kompozíció megőrzésével.",
  keywords: ["építészeti vizualizáció", "render utómunka", "archviz", "fotorealisztikus render", "AI render"],
  openGraph: {
    type: "website", locale: "hu_HU", siteName: "FormaReal",
    title: "FormaReal — Építészeti render realizmusnövelés",
    description: "A terv változatlan marad. Csak a realizmus nő.",
    images: [{ url: "/og/formareal-og.png", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: "/" },
};
```
2. **`src/app/sitemap.ts`** (új) — generáld a publikus oldalakat (`/`, `/login`, `/register`, `/preview` + jövőbeli jogi oldalak).
3. **`src/app/robots.ts`** (új) — engedélyezd a publikus oldalakat, tiltsd a `/app`, `/api`, `/share` útvonalakat:
```ts
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: "*", allow: "/", disallow: ["/app", "/api", "/share"] }],
           sitemap: `${process.env.NEXT_PUBLIC_SITE_URL}/sitemap.xml` };
}
```
4. **Landing szerveroldali tartalom**: emeld ki az állandó marketingszöveget egy szerver-komponensbe, és csak az interaktív részeket (CompareSlider, nyelvváltó, animációk) tartsd `"use client"`-ben. Minimum: a `<h1>`, hero-szöveg, USP-k, FAQ szöveg statikus HTML-ként jelenjenek meg.
5. **FAQ structured data**: a landing FAQ-blokkjához (lásd 5.1) adj `FAQPage` JSON-LD-t.

### 3.3 Teljesítmény / képoptimalizálás — KRITIKUS

**Probléma.**
- `public/logo.png` = **4,2 MB**, `public/logo_original.png` = 3,7 MB, `public/hero-render-before.png` = 2,75 MB, `public/hero-render-after.png` = 2,09 MB.
- Minden `<Image>` `unoptimized` flaggel fut (landing, comparison, workspace, preview) → a Next.js képoptimalizálás kikapcsolva.
- A logó 30–36 px-en jelenik meg, mégis 4 MB-ot tölt be.
- `next.config.ts` nem konfigurál `images`-t, sem tömörítést, sem cache-headert.

**Fejlesztői feladatok.**
1. **Tömörítsd/méretezd a képeket** (build-időben vagy kézzel): `logo.png` → max ~64 px PNG/WebP (<30 KB) + külön `logo@2x`; hero képek → `webp`/`avif`, max ~1600 px szélesség, <300 KB. (Eszköz: `sharp` script a `scripts/` mappában.)
2. **Vedd ki az `unoptimized` flaget** ahol nem indokolt (`landing-view.tsx`, `comparison-view.tsx`, `preview-view.tsx`). A felhasználói feltöltések (`/api/files/...`) maradhatnak `unoptimized`, vagy állíts be `images.remotePatterns`-t.
3. **Hero LCP**: a hero comparison kép kapjon `priority`-t és pontos `sizes`-t; a többi alá `loading="lazy"`.
4. **`next.config.ts`** — adj hozzá `images` és cache-konfigurációt:
```ts
images: { formats: ["image/avif", "image/webp"], minimumCacheTTL: 86400 },
```

### 3.4 i18n inkonzisztencia — MAGAS

**Probléma.** Vegyes nyelvkezelés:
- `auth-form-card.tsx` → **teljesen keményen kódolt angol** ("Create free account", "Full name", "Email address", placeholderek, toast-ok), pedig az `auth-shell` i18n-t használ.
- `admin-view.tsx` → magyar+angol keverék ("Platform administration", "Tenant overview" angol; preset-UI magyar).
- `workspace-view.tsx` → sok `language === "hu" ? ... : ...` inline ternary, nem a `t()` szótárból.
- `landing-view.tsx` → saját `content` objektum, **nem** a közös `src/i18n/index.ts` szótár → duplikált fordítási forrás.
- A nyelvválasztó Zustand store-ban él (`useAppPreferencesStore`), kliensoldali; SSR-nél mindig az alapnyelv (`hu`).

**Fejlesztői feladatok.**
1. **`auth-form-card.tsx`** — minden literált cserélj `t("auth.*", language)` hívásra; vedd fel a hiányzó kulcsokat `src/i18n/index.ts`-be (`auth.createTitle`, `auth.signInTitle`, `auth.fullName`, `auth.emailPlaceholder`, `auth.passwordPlaceholder`, `auth.passwordHint`, `auth.createCta`, `auth.continueCta`, `auth.profileCreated`, `auth.signedIn`, `auth.failed`).
2. Hosszabb távon: vond össze a landing `content` objektumot a központi `i18n` szótárba (vagy fordítva), hogy egyetlen forrás legyen.
3. `admin-view.tsx` placeholder-szövegeit magyarítsd vagy i18n-esítsd.

### 3.5 Accessibility (a11y) — MAGAS

**Probléma.**
- **Landing `CompareSlider`** (`landing-view.tsx` 67–129. sor): nincs `role="slider"`, `aria-*`, billentyűzet-támogatás — csak egér/touch. (A külön `ComparisonView` viszont helyesen csinálja → kódduplikáció.)
- Egyedi toggle-ök (`<input type="checkbox" className="sr-only">` + div) hiányos `aria-checked`/label nélkül (workspace, admin).
- Natív `confirm()` használat törlésnél (workspace, admin) — nem akadálymentes és blokkoló.
- `<details>`/`<summary>` FAQ OK, de a kártya-`<button>`-ök ikonjai gyakran `aria-label` nélküliek (csak `title`).
- Sötét téma kemény kódolt (`<html class="dark">`), világos téma kapcsoló a UI-ban hivatkozott (`common.light/dark`), de nincs ténylegesen bekötve.

**Fejlesztői feladatok.**
1. Cseréld a landing `CompareSlider`-t a meglévő, akadálymentes `ComparisonView`-ra (`src/components/comparison/comparison-view.tsx`) → egyszerre szünteti meg a duplikációt és az a11y-hiányt.
2. A custom toggle-öket cseréld shadcn `Switch`-re, vagy adj `role="switch"` + `aria-checked` + `<label htmlFor>` párosítást.
3. A `confirm()` helyett használd a meglévő `Dialog` (`src/components/ui/dialog.tsx`) komponenst megerősítő modálként.
4. Minden ikon-only gombhoz adj `aria-label`-t.

### 3.6 Biztonság — KRITIKUS/MAGAS

**Probléma.**
- **Admin authorization gap**: `src/app/api/admin/presets/route.ts` `requireAdmin()` csak visszaadja a profilt (`// In future, check profile.role === "admin"`). A `User` modellben (`prisma/schema.prisma`) **nincs `role` mező**. → Bármely user CRUD-olhatja a preseteket (`/api/admin/presets`), és a workspace „Új preset" gombja (`workspace-view.tsx` ~1839) is ezt hívja.
- **Nincs rate-limit** a `/api/auth/login`-on → brute-force kockázat.
- **Nincs middleware** (`find` → nincs `middleware.ts`) → nincs edge-szintű auth/redirect és nincsenek biztonsági fejlécek (CSP, HSTS, X-Frame-Options).
- A `/app` guard **kizárólag kliensoldali** (`AppFrame` `useQuery('/api/auth/session')`) — a HTML maga kiszolgálódik, csak az adat 401-es. Az API-k külön védettek (`requireCurrentProfile`), de a kliens-guard megkerülhető.

**Fejlesztői feladatok.**
1. **`prisma/schema.prisma`** — `User` modellhez `role String @default("user")` mező; `npm run db:push`.
2. **`src/services/auth/session.ts`** + admin route — implementáld a valódi `requireAdmin()`-t: `if (profile.role !== "admin") throw new Error("Forbidden")` → 403.
3. **`src/middleware.ts`** (új) — `/app/*` és `/api/admin/*` szerveroldali session-ellenőrzés + biztonsági fejlécek (`headers()` a `next.config.ts`-ben vagy middleware-ben).
4. `/api/auth/login` — egyszerű IP/email alapú rate-limit (pl. memóriás vagy DB-alapú számláló) és egységes hibaüzenet a user-enumeration ellen (már most „Invalid email or password" → jó).

### 3.7 Analytics, tracking, marketing automatizáció — MAGAS

**Probléma.** `grep` szerint **nulla** tracking: nincs GA4, GTM, Plausible, PostHog, Hotjar, Vercel Analytics. Az egyetlen találat a landing „Generation analytics" feature-kártya szövege. A `GenerationLog` tábla terméken belüli analitikát ad, de a marketing-funnel (látogató → regisztráció → első generálás → export → megosztás) **mérhetetlen**.

**Fejlesztői feladatok.**
1. Vezess be egy privacy-barát analytics-ot (javaslat: Plausible vagy PostHog EU). Helyezz egy `<AnalyticsProvider>`-t a `src/app/providers.tsx`-be.
2. Definiálj eseményeket: `signup_started`, `signup_completed`, `project_created`, `generation_started`, `generation_completed`, `export_done`, `share_link_created`. Ezeket a meglévő mutation `onSuccess` handlerekbe kötheted (`auth-form-card.tsx`, `project-create-form.tsx`, `workspace-view.tsx`).
3. Készíts cookie-consent gate-et az analytics betöltése elé (lásd 3.8).
4. Köss be egy marketing-automatizációs belépési pontot: a `/register` és a (jövőbeli) „Studio várólista"/„Enterprise demo" formok adatait küldd egy CRM/ESP felé (HubSpot/Mailchimp webhook vagy `/api/leads` endpoint).

### 3.8 Hiányzó jogi/EU-oldalak és tartalmak — MAGAS

**Probléma.** Magyar/EU B2B SaaS-nál hiányzik: **Adatkezelési tájékoztató**, **ÁSZF**, **Impresszum**, **cookie-banner/consent**, **kapcsolati oldal** valós elérhetőséggel. A footer (`landing-view.tsx` 969–982) csak `Belépés`/`Kezdés` linket tartalmaz.

**Fejlesztői feladatok.**
1. Hozd létre: `src/app/jogi/adatkezeles/page.tsx`, `src/app/jogi/aszf/page.tsx`, `src/app/jogi/impresszum/page.tsx`, `src/app/kapcsolat/page.tsx` (statikus szerver-komponensek, saját `metadata`-val).
2. Bővítsd a footer-t ezekre mutató linkekkel + cégadat (székhely, adószám, e-mail).
3. Implementálj egy minimál cookie-consent komponenst (`src/components/legal/cookie-consent.tsx`), amely az analytics betöltését kapuzza.

### 3.9 Repo-higiénia — ALACSONY

**Probléma.** A repó gyökerén commitolva: `coverage/` (teszt-lefedettség HTML), `debug_report.md`, `test-render.png` (duplikátum a `public/test-render.png`-vel), `prisma/dev.db` (legacy SQLite, README szerint törölhető), `pnpm-lock.yaml` **és** `package-lock.json` egyszerre.

**Fejlesztői feladatok.**
1. `.gitignore`-hoz: `coverage/`, `*.db`; töröld a `prisma/dev.db`-t és a gyökér `test-render.png`-t.
2. Válassz egy csomagkezelőt (npm vagy pnpm) — töröld a másik lockfile-t a determinisztikus buildért.
3. `debug_report.md` → `docs/` mappába vagy törlés.


---

# 4. Oldalankénti elemzés — Publikus oldalak

---

## 4.1 Landing oldal — `/`

**Fájl:** `src/app/page.tsx` → `src/components/landing/landing-view.tsx` (1000 sor, `"use client"`)

### Jelenlegi állapot
Egész képernyős, sötét témájú, animált (Framer Motion) marketing landing. Szekciók sorrendben: sticky nav → hero (bal copy + jobb before/after csúszka) → stats bar → integrációs logók → features bento (6 kártya) → trust rules → workflow (4 lépés) → comparison showcase → why different → pricing (3 csomag) → FAQ (`<details>`) → final CTA → footer + „vissza a tetejére". Kétnyelvű (saját `content` objektum), nyelvváltó a navban.

### Azonosított problémák

**Marketing / Konverzió**
- **Nincs valódi social proof**: nulla ügyfélvélemény, esettanulmány, referenciaprojekt, ügyfél-logó. Az „integrációs" logók (Revit, Archicad…) nem ügyfelek, és félrevezethetik a látogatót (mintha integrációk lennének, pedig nincs valódi plugin).
- **Vanity statisztikák**: a `stats` (100% geometria, 0 újratervezés, 4 lépés, 7 preset) nem bizalomépítő mérőszámok. Nincs „X stúdió használja", „Y render feldolgozva", időmegtakarítás.
- **Pricing zsákutca**: mindhárom CTA `/register`-re megy (a kód kommentje is jelzi). A „Studio várólista" és „Enterprise demo kérése" gomb nem várólistára/demóra visz → a gomb „töröttnek" hat.
- **A `7 preset` ellentmond a README-nek** (10 default realizmus-preset). A landing „7 anyagpreset"-et ígér (tégla, beton…), de a tényleges presetek (`README` / `prisma/seed.js`) realizmus-kategóriák. Üzenet-inkonzisztencia.
- **Másodlagos CTA gyenge**: a „Termékbemutató" a `/preview`-ra visz, ami statikus szövegoldal valódi képek nélkül (lásd 4.4).
- **Hiányzó „kapcsolat/demó" konverziós út** B2B-hez (telefon, e-mail, naptárfoglalás).

**SEO**
- **Nincs `<h1>`**: a hero cím `<h2>` (577. sor), a szekciócímek `<h3>`. Nincs valódi H1 → kritikus on-page SEO hiba.
- A `#preview` nav-anchor a „Why different" szekcióra ugrik (809. sor `id="preview"`), nem előnézetre → félrevezető horgony.
- Teljes oldal `"use client"` → a tartalom kliensoldalon renderelődik (lásd 3.2).
- Nincs structured data (Organization, Product, FAQPage).
- Alt-szövegek hiányosak/angolok (pl. floating badge „Drag to compare · AI-enhanced result" kemény angol a 624. sorban, magyar nyelven is).

**Tartalom**
- A hero badge „B2B · Review-safe · Helyi-first" — a „Review-safe" és „Helyi-first" angol/magyar keverék, zsargon.
- A `final` CTA badge szövege a nyers „FormaReal" brand-szó (947. sor), nem üzenet.
- A 624. sori floating badge **nincs lefordítva** (mindig angol).

**UI/UX**
- **Nincs mobil menü**: a nav linkek `hidden ... xl:flex` (518. sor) → 1280 px alatt eltűnik a teljes szekciónavigáció, nincs hamburger. Mobilon csak a „Belépés" + „Ingyenes fiók" gombok látszanak.
- A `CompareSlider` nem akadálymentes és egér/touch-only (lásd 3.5).
- A hero két CTA-ja (`Ingyenes fiók` + `Termékbemutató`) mellett a navban is van két gomb → 4 elsődleges akció a hajtás felett, fókusz-szórás.

**Technikai**
- 2,75 MB + 2,09 MB hero PNG-k `unoptimized`, nincs `priority`/`sizes` finomhangolás (LCP).
- A scroll-listener (`onScroll`, 498. sor) minden görgetésnél `setState`-et hívhat — `passive` jó, de érdemes throttle/rAF.
- Két különböző comparison-slider implementáció (landing belső + `ComparisonView`) → duplikáció.

### Javasolt javítások és konkrét szövegjavaslatok

**1) H1 bevezetése + hero átírás (KRITIKUS, SEO+konverzió).** A hero `<h2>` (577. sor) legyen `<h1>`. Javasolt hero-cím (HU):
> **H1:** „Fotórealisztikus építészeti renderek — a terv egyetlen vonalának megváltoztatása nélkül."
> **Alcím:** „A FormaReal a jóváhagyott látványterveidet átadásra kész, fotórealisztikus képpé alakítja. A geometria, a kameraállás és a kompozíció bitről bitre megmarad."

**2) Social proof szekció beszúrása** (a stats bar HELYÉRE vagy után, KRITIKUS konverzió). Új szekció `id="referenciak"`:
> Cím: „Stúdiók, akik már nem retusálnak kézzel"
> 3 ügyfélidézet-kártya (név, stúdió, idézet) + logósor. Amíg nincs valós ügyfél: „Pilot partnereink" / „M Mérnöki Iroda Kft. belső használatban" őszinte megfogalmazás.

**3) Stats újrafogalmazása valódi értékre:**
> „4 lépés rendertől átadásig" ✅ marad
> „0 újratervezés" → „100% kompozíció-megőrzés"
> „~45 mp / kép közepes minőségen" (a tényleges generálási idő alapján, lásd workspace)
> „10 beépített realizmus-preset" (a README-vel összhangban — javítsd 7→10)

**4) Pricing CTA-k javítása** (lásd 4.x feladat): hozz létre `/kapcsolat?plan=studio` és `/kapcsolat?plan=enterprise` cél-oldalt vagy egy modális lead-formot; a `Starter` marad `/register`.

**5) Floating badge fordítása** (624. sor): tedd a `content.{lang}.hero`-ba: HU „Húzd az összehasonlításhoz · AI-javított eredmény".

### Konkrét fejlesztői feladatok (fájl: `src/components/landing/landing-view.tsx`, ha másként nem jelölt)
1. **[Kritikus]** 577. sor: `<h2>` → `<h1>`; a szekciócímek maradjanak `<h3>` vagy lépj `<h2>`-re (egy H1, utána H2 szekciócímek). Frissítsd a hero copy-t a fenti szöveggel a `content.hu.hero.title/body`-ban.
2. **[Kritikus]** Mobil nav: a 518. sori `<nav>` mellé `<MobileMenu>` (Sheet, `src/components/ui/sheet.tsx`) hamburgerrel, `xl` alatt látható.
3. **[Kritikus]** Cseréld a belső `CompareSlider`-t (67–129) a `ComparisonView` importjára (a11y + duplikáció).
4. **[Magas]** Új `#referenciak` social-proof szekció a stats után.
5. **[Magas]** FAQ JSON-LD: a `copy.faq.items`-ből generálj `FAQPage` scriptet (szerver-komponensben vagy `<script type="application/ld+json">`).
6. **[Magas]** Pricing CTA-k (897–906): a `highlighted`/enterprise csomag `href`-jét irányítsd lead-formra.
7. **[Közepes]** 7→10 preset szám egységesítés (`stats` 334. sor, features 357. sor szöveg).
8. **[Közepes]** `#preview` anchor (809) átnevezése `#kulonbozoseg`-re, a nav-link (522) frissítésével; a valódi `/preview` link maradjon külön CTA.
9. **[Közepes]** 624. sori badge i18n-esítése.
10. **[Alacsony]** Scroll handler rAF-throttle.

**Prioritás összesítve: KRITIKUS** (H1, mobil nav, képteljesítmény, social proof).

---

## 4.2 Bejelentkezés — `/login`

**Fájl:** `src/app/login/page.tsx` → `AuthShell mode="login"` → `src/components/auth/auth-form-card.tsx`

### Jelenlegi állapot
Középre igazított kártya „Vissza a főoldalra" linkkel (i18n), e-mail + jelszó mező, „Continue" gomb, alul kereszt-link a regisztrációra. Az `AuthShell` i18n-t használ, de a **kártya tartalma keményen kódolt angol**.

### Azonosított problémák
- **Tartalom/UX (Magas):** keményen kódolt angol szövegek magyar UI mellett: „Sign in", „Sign back into your local pilot profile…", „Email address", „Password", toast „Signed in." / „Authentication failed.".
- **UX (Magas):** nincs jelszó-láthatóság toggle, nincs „Elfelejtett jelszó" funkció, nincs „Maradjak bejelentkezve".
- **UX (Közepes):** a sikeres login `window.location.assign("/app")` — teljes oldalújratöltés a SPA-navigáció helyett (`router.push` jobb lenne).
- **Marketing/SEO (Közepes):** nincs oldal-specifikus `metadata` (title/description); a guardolt jellegű oldalnak `robots: noindex` kellene.
- **Technikai (Közepes):** a form nem használ React Hook Form + Zod-ot (a stackben van), pedig a projekt máshol igen (`project-create-form.tsx`). Manuális `useState`.
- **Biztonság (Magas):** nincs rate-limit (lásd 3.6); nincs CAPTCHA/lassítás ismételt hibás kísérletre.

### Konkrét szövegjavaslatok (HU, i18n-kulcsként)
- `auth.signInTitle`: „Belépés"
- `auth.signInBody`: „Lépj be a profilodba, és folytasd a mentett projektjeiddel."
- `auth.emailPlaceholder`: „E-mail cím"
- `auth.passwordPlaceholder`: „Jelszó"
- `auth.continueCta`: „Belépés"
- `auth.forgotPassword`: „Elfelejtetted a jelszavad?"
- toast `auth.signedIn`: „Sikeres belépés."

### Konkrét fejlesztői feladatok
1. **[Magas]** `auth-form-card.tsx`: minden literál → `t(...)` (lásd 3.4). Vedd fel a kulcsokat `src/i18n/index.ts` `en` és `hu` szótárba.
2. **[Magas]** Jelszó-mező mellé szem-ikon toggle (`type` váltás `password`↔`text`).
3. **[Magas]** „Elfelejtett jelszó" flow: `/api/auth/forgot` endpoint + `src/app/login` alatti link (legalább placeholder-oldal, ha az e-mail-küldés még nincs kész).
4. **[Közepes]** `window.location.assign("/app")` → `useRouter().push("/app")` + `router.refresh()`.
5. **[Közepes]** Oldal `metadata`: `title: "Belépés"`, `robots: { index: false }` (az `AuthShell` jelenleg kliens-komponens — emelj be egy szerveroldali `metadata` exportot a `login/page.tsx`-be).
6. **[Közepes]** Refaktor RHF + Zod-ra a konzisztenciáért.

**Prioritás: MAGAS** (i18n + alap auth-UX hiányok).

---

## 4.3 Regisztráció — `/register`

**Fájl:** `src/app/register/page.tsx` → `AuthShell mode="register"` → `auth-form-card.tsx`

### Jelenlegi állapot
Ugyanaz a kártya, `isRegister=true`: + „Full name" mező, jelszó-min. 8 karakter validáció (inline figyelmeztetés), „Create profile" gomb. Siker után toast + `window.location.assign("/app")`.

### Azonosított problémák
- **Tartalom/UX (Magas):** keményen kódolt angol (lásd 4.2), pl. „Create free account", „Create a local SaaS pilot profile…", „Full name", figyelmeztetés „Password must be at least 8 characters.".
- **Jogi (Magas):** **nincs ÁSZF/Adatkezelés elfogadó checkbox** a regisztrációnál — EU/GDPR-kötelező B2B-nél.
- **UX (Magas):** nincs jelszóerősség-jelző, csak min. hossz; nincs jelszó-megerősítés mező; nincs e-mail-formátum hibajelzés a beküldés előtt (csak HTML `type=email`).
- **Konverzió (Közepes):** a regisztrációs kártya nem kommunikál értéket (mi történik regisztráció után, mit kap a user). A landing ígéreteit itt meg kellene erősíteni (pl. „Ingyenes, bankkártya nélkül").
- **Technikai/Marketing (Magas):** nincs `signup_completed` esemény (analytics, lásd 3.7); nincs lead-továbbítás CRM-be.
- **Biztonság (Közepes):** a `User.passwordHash` nullable (`schema.prisma`) — a regisztráció kötelezővé teszi, de a séma nem kényszeríti.

### Konkrét szövegjavaslatok (HU)
- `auth.createTitle`: „Ingyenes fiók létrehozása"
- `auth.createBody`: „Hozd létre a profilodat, és kezdd el a renderek feldolgozását. Bankkártya nem szükséges."
- `auth.fullName`: „Teljes név"
- `auth.passwordHint`: „A jelszó legalább 8 karakter legyen."
- `auth.terms`: „Elfogadom az [ÁSZF]-et és az [Adatkezelési tájékoztatót]."
- `auth.createCta`: „Fiók létrehozása"

### Konkrét fejlesztői feladatok
1. **[Magas]** i18n (mint 4.2).
2. **[Magas]** ÁSZF/Adatkezelés elfogadó **checkbox** (kötelező a beküldéshez), a `formInvalid` feltételbe (`auth-form-card.tsx`) kösd be; linkek a 3.8 jogi oldalakra.
3. **[Magas]** `signup_completed` analytics-esemény + opcionális lead-továbbítás a `submit()` `onSuccess`-ben.
4. **[Közepes]** Jelszóerősség-jelző + „bankkártya nélkül" mikro-copy.
5. **[Közepes]** `metadata`: `title: "Regisztráció"`, `noindex`.
6. **[Közepes]** `prisma`: `passwordHash` → `String` (non-null) + migráció, miután minden user-nek van jelszava.

**Prioritás: MAGAS** (jogi checkbox + i18n + analytics).

---

## 4.4 Termékbemutató — `/preview`

**Fájl:** `src/app/preview/page.tsx` → `src/components/preview/preview-view.tsx`

### Jelenlegi állapot
Kétnyelvű, sötét „vezetett bemutató": fejléc + hero (cím, alcím, két CTA: `Ingyenes fiók` és `Vissza a landingre`) + egyetlen illusztrációs kép (`/test-render.png`) + 6 szöveges kártya (Dashboard, Projects, Workspace, Compare, Export, Settings). Nyelvváltó a fejlécben.

### Azonosított problémák
- **Marketing/Tartalom (Magas):** ez **nem** valódi termékbemutató — nincsenek képernyőképek, GIF-ek, videó vagy interaktív demó; csak felsorolja szövegben, mit csinálnak a felületek. A landing „Termékbemutató" CTA-jából ide érkező látogató csalódik.
- **Konverzió (Közepes):** nincs „Belépés" CTA azoknak, akiknek már van fiókjuk; csak `register` és `vissza`.
- **SEO (Közepes):** kliens-komponens, nincs `metadata`; két H is van (header `<h1>` „Termékbemutató" + hero `<h2>` „Vezetett termékbemutató") → részben redundáns.
- **Tartalom (Közepes):** a kártyák a `Compare`/`Export`/`Settings` ugyanúgy néznek ki, mintha különálló navigálható felületek lennének, pedig a Compare és Export a workspace része → félrevezető IA.
- **Technikai (Alacsony):** a `/test-render.png` 13 KB OK, de a `contrast-110 saturate-[1.12]` CSS-szűrő „demó-hatás", nem valódi eredmény.

### Konkrét szövegjavaslatok / módosítások
- Tedd valódivá: minden kártyához **valódi képernyőkép** (a `/app` felületekről), `next/image`-dzsel, lazy-loaddal.
- Adj hozzá egy rövid **before/after interaktív blokkot** (a `ComparisonView`-val) a valódi `hero-render-before/after.png`-vel.
- Hero alcím (HU): „Nézd meg, hogyan készül egy fotórealisztikus átadási kép négy lépésben — feltöltés, preset, generálás, összehasonlítás."
- Tegyél „Belépés" másodlagos linket a CTA-k mellé.

### Konkrét fejlesztői feladatok (fájl: `src/components/preview/preview-view.tsx`)
1. **[Magas]** Cseréld a szöveges kártyákat valódi screenshotokra (készíts `/public/preview/*.webp` képeket a `/app`, workspace, compare, export felületekről).
2. **[Magas]** Ágyazz be egy `ComparisonView` demót valós képpel.
3. **[Közepes]** Adj „Belépés" linket (`/login`) a hero CTA-sorba (151–157).
4. **[Közepes]** `metadata` + a két H egységesítése (egy H1).
5. **[Alacsony]** Fontold meg a `/preview` és a landing „compare/workflow" szekciók összevonását (átfedő tartalom).

**Prioritás: MAGAS** (a CTA-ígéret és a tartalom nincs összhangban).

---

## 4.5 Nyilvános megosztás — `/share/[token]`

**Fájl:** `src/app/share/[token]/page.tsx` → `src/components/share/share-view.tsx`

### Jelenlegi állapot
Read-only, token-alapú nyilvános projektnézet. Lekéri `/api/share/[token]`-t (React Query), fejléc (projektnév, ügyfél, képszám, dátum), majd grid: assetenként `ComparisonView` (eredeti vs. legutóbbi generált) vagy egyszerű kép, verzió-badge-ek. Loading skeleton és hiba-állapot (lejárt/visszavont link) megvan. **Csak magyar** (kemény kódolt), nincs nyelvváltó.

### Azonosított problémák
- **Marketing (Magas):** ez az **ügyfélnek küldött felület** — mégis nulla branding-CTA. Egy potenciális új ügyfél, aki látja a megosztást, nem tudja, mi a FormaReal, és nincs „Készítsd te is" / „Tudj meg többet" link a landingre. Kihagyott akvizíciós csatorna.
- **Tartalom/i18n (Közepes):** keményen kódolt magyar (`formatVersionLabel`, fejléc, footer) — ha egy nemzetközi ügyfélnek osztják meg, nincs angol.
- **SEO/Adatvédelem (Közepes):** nincs `metadata`/`noindex` — a megosztott (potenciálisan bizalmas ügyfél-) projektek **indexelhetők** lehetnek. A `robots`-ban a `/share` tiltása (3.2) segít, de oldalszinten is `noindex` kell.
- **UX (Közepes):** nincs letöltés/„nagyban megnyitás" gomb az ügyfélnek; nincs visszajelzési/jóváhagyási lehetőség (B2B review-folyamathoz hasznos lenne „Jóváhagyom"/„Módosítást kérek").
- **Technikai (Alacsony):** a `fetch(...).then(r => r.json())` nem kezeli a nem-OK választ explicit (a `isError` a parse-on múlik).

### Konkrét szövegjavaslatok / UI módosítások
- Footer-be diszkrét CTA (HU/EN): „Ezt a nézetet a **FormaReal** készítette — fotórealisztikus építészeti renderek a kompozíció megőrzésével. **Tudj meg többet →** (link a `/`-ra)."
- Opcionális „Letöltés" gomb assetenként (a publikus, nem érzékeny exporthoz).

### Konkrét fejlesztői feladatok (fájl: `src/components/share/share-view.tsx`)
1. **[Magas]** Adj branding-CTA-t a footerbe a landingre mutató linkkel (akvizíció).
2. **[Közepes]** `noindex` az oldalra (`metadata` a `share/[token]/page.tsx` szerver-komponensben: `robots: { index: false }`).
3. **[Közepes]** i18n: vedd fel a `formatVersionLabel`-t és a fejléc/footer szövegeket a nyelvi rétegbe; add a nyelvváltót, vagy vedd át a megosztó nyelvi preferenciáját token-paraméterként.
4. **[Közepes]** B2B jóváhagyás: opcionális „Jóváhagyom / Módosítást kérek" gomb → `/api/share/[token]/feedback`.
5. **[Alacsony]** Robusztus hibakezelés a fetch-ben (státusz-ellenőrzés a `fetchJson` segéddel).

**Prioritás: MAGAS** (akvizíciós CTA + indexelés-tiltás bizalmas tartalomnál).

---

# 5. Oldalankénti elemzés — Alkalmazás (auth mögött)

---

## 5.1 Dashboard — `/app`

**Fájl:** `src/app/app/page.tsx` → `src/components/dashboard/dashboard-view.tsx` (99 sor)

### Jelenlegi állapot
`AppFrame` (eyebrow „M Mérnöki Iroda Kft.", title „FormaReal") + egyetlen hero-banner: badge-ek, cím/leírás (i18n `dashboard.hero*`), „Open projects" CTA, három coverage-chip, és a `ProjectCreateForm`. Ennyi.

### Azonosított problémák
- **Tartalom/Konverzió (Magas):** a dashboard **üres élményt** ad — nincs metrika, nincs „legutóbbi projektek", nincs „folytasd, ahol abbahagytad". Pedig létezik `metric-card.tsx` komponens és `dashboard-metric-card.test.tsx` teszt → a metrikakártyák meg vannak írva, de **nincsenek bekötve**.
- **Marketing-ígéret szakadás (Közepes):** a landing „Generálási analitika" (feldolgozási idők, provider-használat, sikerráta, preset-eloszlás) képességet ígér — a dashboard ezt **nem mutatja**. A `recharts` függőség telepítve, de a dashboardon nincs chart.
- **UX (Közepes):** az `AppFrame` H1-e mindig „FormaReal" (brand), nem leíró oldalcím; a valódi tartalmi cím `<h2>` a heróban → minden app-oldalon a H1 a brand.
- **IA (Közepes):** a dashboard és a `/app/projects` szinte ugyanazt csinálja (mindkettő `ProjectCreateForm`-ot tartalmaz) → átfedés.
- **i18n (Alacsony):** „Local-first · Review-safe" badge kemény angol (54. sor).

### Konkrét fejlesztői feladatok (fájl: `src/components/dashboard/dashboard-view.tsx`)
1. **[Magas]** Köss be metrikasort `metric-card.tsx`-szel: projektek száma, összes generálás, átlagos feldolgozási idő, sikerráta — adatforrás `/api/logs` + `/api/projects` (vagy új `/api/stats` endpoint, ami a `GenerationLog`-ból aggregál).
2. **[Magas]** „Legutóbbi projektek" lista (3–5 elem) a `/api/projects`-ből, „Folytatás" linkekkel — a felhasználó azonnal visszatérhet a munkájához.
3. **[Közepes]** Mini analitika `recharts`-szal (provider-használat, preset-eloszlás), beváltva a landing ígéretét.
4. **[Közepes]** Csökkentsd az átfedést `/app/projects`-szel: a dashboard legyen áttekintő, a projektlétrehozás maradjon a Projects oldalon (vagy modálban).
5. **[Alacsony]** „Local-first · Review-safe" badge i18n.

**Prioritás: MAGAS** (üres dashboard → gyenge aktiváció/retención).

---

## 5.2 Projektek — `/app/projects`

**Fájl:** `src/app/app/projects/page.tsx` → `src/components/projects/projects-view.tsx` (287 sor)

### Jelenlegi állapot
„Új projekt" panel (SVG-illusztráció + nyitható `ProjectCreateForm` `+` gombbal) + „Mentett projektek" kártya: loading skeleton, üres állapot (i18n), majd projektkártyák (név, ügyfél, fájlszám, verziószám, leírás, frissítés dátuma, verzió-badge-ek, „Megnyitás" CTA). React Query a `/api/projects`-re. Jól megírt, animált.

### Azonosított problémák
- **UX (Közepes):** nincs keresés/szűrés/rendezés a projektlistában — sok projektnél nehézkes.
- **UX (Közepes):** nincs projekt-törlés/átnevezés/duplikálás a listából (csak megnyitás); a `/api/projects/[id]` DELETE/PATCH létezik, de a UI nem használja itt.
- **Tartalom/i18n (Közepes):** vegyes — egyes szövegek `t()`-ből, mások inline `language === "hu" ? ...` (pl. „verzió"/„versions", „Új projekt").
- **UX (Alacsony):** a „+” gomb felfedezhetősége gyenge — könnyen átsiklik rajta a felhasználó; a fő CTA nem egyértelmű.
- **Technikai (Alacsony):** a `formatProjectAssetCount` keményen „file"/„files" angol szót ad vissza (még magyar UI-n is).

### Konkrét fejlesztői feladatok (fájl: `src/components/projects/projects-view.tsx`)
1. **[Közepes]** Kereső + rendezés (név/dátum) a „Mentett projektek" fejlécbe.
2. **[Közepes]** Projektkártya kontextus-műveletek: átnevezés, törlés (megerősítő `Dialog`-gal, nem `confirm()`), duplikálás — a meglévő API-kra kötve.
3. **[Közepes]** i18n egységesítés (`formatProjectAssetCount` magyarítása: „fájl"; inline ternaryk → `t()`).
4. **[Alacsony]** A „Új projekt" CTA tegyél egyértelműbbé (látható gomb felirattal a `+` mellett).

**Prioritás: KÖZEPES.**

---

## 5.3 Munkafelület (Workspace) — `/app/projects/[projectId]`

**Fájl:** `src/app/app/projects/[projectId]/page.tsx` → `src/components/workspace/workspace-view.tsx` (1890 sor — a termék magja)

### Jelenlegi állapot
Háromhasábos munkafelület: **bal** asset-lista (drag-to-reorder dnd-kit, feltöltés `UploadDropzone`, törlés), **közép** vászon (toolbar: auto-mentés jelző, Compare, Share-dialógus, provider-pill, export-célok/formátum/skála + letöltés, panel-összecsukás; eredeti kép + előnézeti kép `ZoomableImagePanel`-ekkel zoom/pan; generálási overlay heurisztikus progresszel; queue-státusz csík), **jobb** vezérlőpanel (verzióelőzmény restore-ral, „Automatikus javítás" + batch generálás, preset-választó toggle-lel + új-preset-létrehozás, 10 szín/fény slider, saját prompt mód, generálási minőség low/medium/high, 2× upscaling toggle, generálási előzmények, képmetaadatok). Teljes képernyős mód, inpainting/anyagszerkesztő overlay, onboarding tour, új-preset-modál. Funkcionálisan rendkívül gazdag.

### Azonosított problémák

**Tartalom / i18n (Magas)**
- Tömeges inline `language === "hu" ? ... : ...` ternary az egész fájlban (több tucat hely) a `t()` szótár helyett → karbantarthatatlan, könnyen kicsúszik szinkronból.
- A preset megjelenített neve `t(\`preset.${name}\`)` kulcsra épül — ha a kulcs hiányzik (pl. user által létrehozott „custom" preset), a nyers slug látszik (pl. „naplemente-realizmus").

**UI/UX (Magas)**
- **Magas információsűrűség / kognitív teher**: a jobb panel egyszerre mutat verzióelőzményt, auto-enhance-t, presetet, 10 slidert, saját promptot, minőséget, upscalingot, előzményt, metaadatot — egyetlen görgethető oszlopban, csoportosítás/akkordeon nélkül. Új felhasználónak ijesztő.
- **Két különálló mentál-modell ütközik**: „preset + sliderek" (CSS-szűrő, kliens-előnézet) és „AI-generálás" (Fal.ai). A 10 slider valójában csak CSS-filtert ad az előnézethez (`filterStyle`, 851–869), **nem** befolyásolja az AI-generálást közvetlenül — ez félrevezető (a felhasználó azt hiheti, a sliderek a generálást vezérlik).
- **Compare = teljes képernyő kényszer** (1125–1135): a Compare gomb automatikusan fullscreenbe vált, nincs inline összehasonlítás a normál nézetben.
- **Natív `confirm()`** asset-törlésnél (1092) — lásd 3.5.
- **Megosztás-dialógus pozíció** `absolute top-14 left-1/2` (1160) — hosszú toolbaron elcsúszhat, nem `Popover`/`Dialog` primitív.
- **Drag-reorder csak kliensoldali** (`assetOrder` state) — újratöltéskor elveszik a sorrend (nincs perzisztálva a DB-be).

**Technikai (Magas/Közepes)**
- **Nincs job-queue** (README is jelzi): párhuzamos generálás ugyanarra az assetre versenyhelyzetet okoz. A batch-generálás soros `for await` loop a kliensen — ha a felhasználó elnavigál, megszakad.
- A generálási progressz **heurisztikus** (`GeneratingOverlay`, idő-alapú becslés), nem valós szerver-progressz → a „95%-on ragad" élmény. A `mock-local`/`openai` provider `supportsRealtimeProgress=false`.
- **Export méretezés bug-gyanús** (717–718): a `width/height` kifejezés `(selectedAsset?.width ?? undefined) ? ... : undefined` — zavaros, törékeny logika; a 2×/4× skála helyessége kérdéses.
- Az „Új preset" mentés a **`/api/admin/presets`-re** POST-ol a workspace-ből (1839) → minden user globális presetet hoz létre (lásd admin jogosultság, 3.6); ráadásul a `settingsJson` a CSS-editor-értékeket menti, nem az AI-preset szemantikát (`realismIntensity` stb.) → a preset később torzan alkalmazódik (`applyPresetToEditorSliders` más kulcsokat vár).
- Sok inline `style`/`onPointerDown stopPropagation` workaround a fullscreen sliderek körül (889–916) → törékeny event-kezelés.

**Marketing (Közepes)**
- A „Click-to-texture targeting" (landing feature) az inpainting/anyagszerkesztőn keresztül elérhető, de a belépési pont (`Anyagszerkesztő` gomb) csak generált verzió után jelenik meg — a felfedezhetőség gyenge.

### Konkrét fejlesztői feladatok (fájl: `src/components/workspace/workspace-view.tsx`, ha másként nem jelölt)
1. **[Magas]** Csoportosítsd a jobb panelt **akkordeonokba** (shadcn `Accordion`): „Generálás" (auto-enhance, minőség, upscaling, prompt), „Finomhangolás" (sliderek), „Verziók", „Előzmény & metaadat". Alapból csak a „Generálás" nyitva.
2. **[Magas]** Tisztázd a slider↔generálás viszonyt: vagy kösd a slidereket a generálási paraméterekbe (`settingsOverride`), vagy címkézd egyértelműen „Előnézeti szűrő (nem befolyásolja az AI-generálást)".
3. **[Magas]** Perzisztáld az asset-sorrendet: `ImageAsset`-hez `sortOrder Int` mező (`schema.prisma`) + PATCH endpoint; a `handleDragEnd` mentse szerverre.
4. **[Magas]** A workspace „Új preset" mentését válaszd külön a globális admin-presetektől: vagy user-szintű presetek (`Preset.userId`), vagy tiltsd nem-admin usernek; és mentsd az AI-szemantikus kulcsokat, ne a CSS-editor-értékeket.
5. **[Magas]** i18n: a tömeges inline ternaryket fokozatosan vidd át `t()` kulcsokba.
6. **[Közepes]** Cseréld a `confirm()`-ot `Dialog`-ra; a Share-dialógust `Popover`-re.
7. **[Közepes]** Inline (nem fullscreen) Compare opció; a fullscreen legyen választható, ne kényszer.
8. **[Közepes]** Export-méretezés logika refaktor (717–718) + egységteszt a 1×/2×/4× skálára.
9. **[Közepes]** Valós progressz: ha a provider támogatja (Fal.ai), iratkozz fel a szerver-eseményekre; különben tartsd a heurisztikát, de jelezd „becsült".
10. **[Közepes]** Job-queue bevezetése (szerveroldali) a versenyhelyzet és a batch-megszakadás ellen.
11. **[Alacsony]** „Anyagszerkesztő/Textúra-célzás" felfedezhetőség javítása (tooltip/onboarding lépés).

**Prioritás: MAGAS** (a termék magja; UX-egyszerűsítés és a preset/jogosultság-bug konverziókritikus).

---

## 5.4 Beállítások — `/app/settings` (és `/settings`)

**Fájl:** `src/app/app/settings/page.tsx` + `src/app/settings/page.tsx` → `src/components/settings/settings-view.tsx` (28 sor)

### Jelenlegi állapot
Egyetlen kártya: „Integrations" cím + leírás + statikus szövegtest (mind i18n `settings.*`). Lényegében placeholder.

### Azonosított problémák
- **Tartalom (Magas):** üres funkcionalitás — nincs profil-szerkesztés (név/e-mail/jelszó), nincs nyelv/téma beállítás (a nyelvváltó csak a fejlécben), nincs export-cél konfiguráció, nincs API-kulcs/provider beállítás a felhasználónak.
- **IA/Technikai (Magas):** **duplikált route** (`/settings` és `/app/settings` ugyanazt rendereli); a `/settings` guardolatlan.
- **UX (Közepes):** a felhasználó nem tudja itt törölni a fiókját / kijelentkezni az összes eszközről (GDPR „törléshez való jog").

### Konkrét fejlesztői feladatok
1. **[Magas]** Tölts tartalmat: „Profil" szekció (név/e-mail/jelszóváltás → `/api/auth/*` bővítés), „Megjelenés" (nyelv, téma), „Export célok" (a meglévő `EXPORT_DESTINATIONS` konfigurálása), „Fiók" (kijelentkezés, fiók törlése).
2. **[Magas]** Szüntesd meg a route-duplikációt: töröld a `src/app/settings/page.tsx`-t, és tegyél `redirect("/app/settings")`-et, vagy fordítva — egyetlen kanonikus útvonal.
3. **[Közepes]** GDPR: „Adataim letöltése" és „Fiók törlése" műveletek.

**Prioritás: MAGAS** (üres alapfunkció + route-duplikáció).

---

## 5.5 Providerek — `/providers` (ÁRVA)

**Fájl:** `src/app/providers/page.tsx` → `src/components/providers/providers-view.tsx` (91 sor)

### Jelenlegi állapot
Aktív provider kiemelő kártya + provider-kártyák (`/api/providers`): név, label, configured-badge, státuszüzenet, realtime-progress/API-kulcs/modell info. i18n-elt. Az `AppFrame`-et használja, de **a gyökéren** (`/providers`), nem `/app/providers` alatt → a guard `isAppRoute=false`, így a session-ellenőrzés kimarad, viszont a `/api/providers` 401-et adhat → üres lista.

### Azonosított problémák
- **IA/Navigáció (Magas):** **árva oldal** — nincs a nav-ban (`app-frame.tsx` `navigationItems` nem tartalmazza), és nincs `/app/providers` változat, így csak közvetlen URL-lel érhető el.
- **Technikai (Magas):** guardolatlan + `useQuery` nem kezel `isLoading`/`isError`/üres állapotot (`data?.providers.map` — ha undefined, semmi nem jelenik meg).
- **Tartalom (Közepes):** a README `/app/providers`-t hivatkozik, ami nem létezik → dokumentáció-kód eltérés.

### Konkrét fejlesztői feladatok
1. **[Magas]** Helyezd át `/app/providers` alá (`src/app/app/providers/page.tsx`), és add hozzá a `navigationItems`-hez (`app-frame.tsx`), vagy ágyazd a Settings „Providerek" füle alá. Töröld a gyökér `/providers`-t (vagy redirect).
2. **[Magas]** Adj `isLoading` skeleton + `isError`/üres állapotot.
3. **[Közepes]** Frissítsd a README „Key routes" listát a valós útvonalakra.

**Prioritás: MAGAS** (elérhetetlen, guardolatlan funkció).

---

## 5.6 Előzmények — `/history` (ÁRVA)

**Fájl:** `src/app/history/page.tsx` → `src/components/history/history-view.tsx` (59 sor)

### Jelenlegi állapot
Generálási logok listája (`/api/logs`): fájlnév, státusz-badge, provider, prompt-verzió, feldolgozási idő (ms), létrehozás, hibaüzenet. `AppFrame`-ben, de a gyökéren → ugyanaz az árva/guard probléma, mint a providereknél.

### Azonosított problémák
- **IA/Navigáció (Magas):** árva oldal (README `/app/history`-t ígér, nem létezik; nincs a navban).
- **Technikai (Közepes):** nincs loading/üres/error állapot (`data?.logs.map`); nincs lapozás/szűrés (sok log esetén); a feldolgozási idő `ms`-ben, projektre/assetre kattintás nincs (pedig `imageAsset.projectId` elérhető → linkelhető lenne).
- **UX (Közepes):** a log nem linkel vissza a projekthez/assethez.

### Konkrét fejlesztői feladatok
1. **[Magas]** Helyezd át `/app/history` alá + add a navhoz (vagy a projekt-workspace „Generálási előzmények" alá, ami már létezik) — döntsd el, kell-e globális history oldal.
2. **[Közepes]** Loading/üres/error állapot; lapozás vagy „utolsó 50".
3. **[Közepes]** Tedd a sorokat kattinthatóvá → `/app/projects/{projectId}`.

**Prioritás: MAGAS** (elérhetetlen funkció) / a tartalmi finomítás Közepes.

---

## 5.7 Admin — `/app/admin`

**Fájl:** `src/app/app/admin/page.tsx` → `src/components/admin/admin-view.tsx` (359 sor)

### Jelenlegi állapot
Preset-könyvtár kezelés: kategóriánként csoportosított presetek, szerkesztés/törlés, „Új preset" modál (`PresetEditor`: név, leírás, kategória, 8 slider 0–1, 2 boolean toggle). Két placeholder kártya („Tenant overview", „Usage governance"). A `PresetEditor` natív `<input>`/`<textarea>`-t használ (nem UI-komponenst).

### Azonosított problémák
- **Biztonság (KRITIKUS):** **nincs role-check** — a nav minden bejelentkezett usernek mutatja az Admin-t (`app-frame.tsx`), és a `/api/admin/presets` `requireAdmin()` csak TODO (3.6). Bármely user szerkesztheti/törölheti a globális preseteket.
- **Tartalom/i18n (Közepes):** magyar+angol keverék (cím „Admin", „Platform administration"; placeholderek angol: „Tenant overview", „Usage governance"); a preset-UI magyar.
- **UX (Közepes):** natív `confirm()` törlésnél; `PresetEditor` natív inputjai eltérnek a design-rendszertől (`Input`/`Textarea` komponensek helyett).
- **Tartalom (Alacsony):** két nagy placeholder kártya éles felületen — vagy rejtsd el, amíg nincs funkció, vagy jelöld „Hamarosan".

### Konkrét fejlesztői feladatok (fájl: `src/components/admin/admin-view.tsx` + `src/app/api/admin/presets/route.ts`)
1. **[Kritikus]** Valódi role-alapú védelem (lásd 3.6): `User.role`, `requireAdmin()` 403-mal, és a nav `Admin` linket csak `session.profile.role === "admin"` esetén jelenítsd meg (`app-frame.tsx`).
2. **[Közepes]** i18n: a placeholder/cím szövegek magyarítása vagy `t()`.
3. **[Közepes]** `confirm()` → `Dialog`; `PresetEditor` natív inputjai → `Input`/`Textarea`/`Switch`.
4. **[Alacsony]** Placeholder kártyák „Hamarosan" jelöléssel vagy feature-flag mögé.

**Prioritás: KRITIKUS** (jogosultsági rés).

---

# 6. Végső összefoglaló és ütemezett roadmap

A feladatok három idősávba rendezve. Minden tétel hivatkozza a forrásszekciót.

## 6.1 Quick Wins (1–2 nap) — magas hatás, alacsony erőfeszítés

1. **Layout metadata kibővítése** (`src/app/layout.tsx`): magyar description, `metadataBase`, OG/Twitter tagek, kulcsszavak. *(3.2)*
2. **`robots.ts` + `sitemap.ts` létrehozása.** *(3.2)*
3. **Landing H1 javítása**: `<h2>` → `<h1>` + új hero-copy. *(4.1)*
4. **Képek tömörítése**: `logo.png` 4,2 MB → <30 KB; hero PNG-k → WebP <300 KB; `unoptimized` eltávolítása ahol lehet. *(3.3)*
5. **Auth űrlap i18n** (`auth-form-card.tsx`): angol literálok → `t()`. *(3.4, 4.2, 4.3)*
6. **ÁSZF/Adatkezelés checkbox** a regisztrációhoz (akár ideiglenes jogi oldalakkal). *(4.3, 3.8)*
7. **Admin nav elrejtése** nem-admin usertől + `requireAdmin()` 403. *(3.6, 5.7)*
8. **Route-duplikáció rendezése**: `/settings`, `/projects/[id]` redirect a `/app/*`-ra; `/providers`, `/history` áthelyezése `/app` alá + nav. *(2.3, 5.4–5.6)*
9. **Pricing CTA + floating badge fordítás** a landingen. *(4.1)*
10. **`share` + auth oldalak `noindex`** + `/share` tiltása a robotsban. *(4.5, 4.2)*
11. **Repo-higiénia**: `coverage/`, `prisma/dev.db`, gyökér `test-render.png` eltávolítása, egy lockfile. *(3.9)*

## 6.2 Közepes fejlesztések (1–2 hét)

1. **Mobil navigáció** (hamburger/Sheet) a landingen. *(4.1)*
2. **Social proof szekció** + valós statisztikák a landingen. *(4.1)*
3. **Analytics + eseménykövetés** (Plausible/PostHog) + cookie-consent. *(3.7, 3.8)*
4. **Jogi oldalak** (Adatkezelés, ÁSZF, Impresszum, Kapcsolat) + footer-linkek. *(3.8)*
5. **Dashboard feltöltése**: metrikakártyák + legutóbbi projektek + mini analitika (`metric-card.tsx`, `recharts`). *(5.1)*
6. **Settings funkcionalitás**: profil, megjelenés, export-célok, fiók (GDPR). *(5.4)*
7. **`/preview` valódivá tétele**: képernyőképek + élő before/after. *(4.4)*
8. **Workspace jobb panel akkordeon** + slider/generálás-viszony tisztázása. *(5.3)*
9. **a11y kör**: landing slider → `ComparisonView`, `confirm()` → `Dialog`, switchek `aria`-val. *(3.5)*
10. **Share oldal akvizíciós CTA** + i18n + jóváhagyás. *(4.5)*
11. **Providers/History loading/error/üres állapotok** + history-linkelés. *(5.5, 5.6)*

## 6.3 Nagyobb fejlesztések (1 hónap+)

1. **Szerveroldali auth/middleware** + biztonsági fejlécek (CSP/HSTS) + login rate-limit. *(3.6)*
2. **Role-rendszer** (`User.role`) + valódi admin governance (a placeholder kártyák tartalommal). *(3.6, 5.7)*
3. **Job-queue** a generáláshoz (versenyhelyzet, batch-megbízhatóság, valós progressz). *(5.3)*
4. **Landing szerveroldali renderelés** (statikus marketingtartalom kiemelése a kliensből) + FAQ/Product structured data. *(3.2, 4.1)*
5. **Lead-pipeline**: Studio várólista / Enterprise demo formok + CRM-integráció (HubSpot/Mailchimp connector). *(4.1, 3.7)*
6. **User-szintű presetek** és a workspace „Új preset" szétválasztása a globális admin-presetektől + preset-szemantika javítása. *(5.3)*
7. **Asset-sorrend és editor-állapot perzisztálása** a DB-ben. *(5.3)*
8. **Egységes i18n forrás** (landing `content` + központi szótár összevonása), világos/sötét téma tényleges bekötése. *(3.4)*

## 6.4 Legnagyobb várható konverziónövelő változtatások (rangsor)

1. **Social proof + valós érték-statisztikák a landingen** — a bizalom a B2B-konverzió fő gátja jelenleg. *(4.1)*
2. **Pricing-funnel javítása** (Studio/Enterprise lead-formok) — a jelenlegi zsákutca elveszített leadeket jelent. *(4.1)*
3. **`/preview` valódivá tétele** (a „Termékbemutató" CTA beváltása). *(4.4)*
4. **Share oldal „Tudj meg többet" CTA-ja** — minden megosztás akvizíciós csatorna. *(4.5)*
5. **Dashboard aktiváció** (metrikák + legutóbbi projektek) — javítja a retenciót/visszatérést. *(5.1)*
6. **Regisztráció súrlódás-csökkentés** (i18n, „bankkártya nélkül", jelszó-toggle). *(4.3)*

## 6.5 Legfontosabb SEO fejlesztések (rangsor)

1. `<h1>` + helyes H-hierarchia a landingen. *(4.1)*
2. `metadataBase` + OG/Twitter + magyar description + per-oldal `metadata`. *(3.2)*
3. `robots.ts` + `sitemap.ts`. *(3.2)*
4. Landing tartalom szerveroldali renderelése (indexelhetőség). *(3.2)*
5. Structured data: `Organization`, `Product`, `FAQPage`. *(3.2, 4.1)*
6. Jogi/tartalmi oldalak (hosszú-farok kulcsszavak, E-E-A-T). *(3.8)*
7. Képoptimalizálás (Core Web Vitals: LCP). *(3.3)*

## 6.6 Legfontosabb UX fejlesztések (rangsor)

1. Workspace jobb panel egyszerűsítése (akkordeon) + slider/generálás tisztázás. *(5.3)*
2. Mobil navigáció a landingen. *(4.1)*
3. Dashboard üres-élmény megszüntetése. *(5.1)*
4. Konzisztens i18n (vegyes magyar/angol felszámolása). *(3.4)*
5. `confirm()` → `Dialog`, akadálymentes sliderek/switchek. *(3.5)*
6. Navigáció rendbetétele (árva/duplikált route-ok). *(2.3)*
7. Inline (nem kényszerű fullscreen) Compare. *(5.3)*

## 6.7 Legfontosabb technikai fejlesztések (rangsor)

1. **Admin jogosultság + szerveroldali auth/middleware** (biztonság). *(3.6)*
2. **Képoptimalizálás + `next.config` képbeállítás** (teljesítmény). *(3.3)*
3. **Job-queue** a generáláshoz. *(5.3)*
4. **Analytics/tracking infrastruktúra.** *(3.7)*
5. **Export-méretezés refaktor + tesztek**; preset-mentés szemantika javítása. *(5.3)*
6. **Route-konszolidáció** + README-kód szinkron. *(2.3)*
7. **`prisma` szigorítások** (`passwordHash` non-null, `User.role`, `ImageAsset.sortOrder`). *(3.6, 5.3)*

---

## 7. Megjegyzés a végrehajtó AI-nak

- A kódbázis **erős mérnöki alapokon** áll (tiszta szolgáltatásréteg, Zod-validáció, tesztek, CI, i18n-keret, akadálymentes `ComparisonView`). A fő hiányosságok **nem** architekturálisak, hanem: (a) marketing/SEO/konverziós réteg szinte teljes hiánya a publikus oldalakon, (b) konzisztencia-adósság (brand, i18n, route-ok), (c) néhány konkrét biztonsági/teljesítmény-rés.
- A módosításokat **kis, izolált PR-okban** végezd, szekciónként, és minden lépés után futtasd a `npm run lint && npm run typecheck && npm run test` hármast.
- Ahol a dokumentum konkrét i18n-kulcsot javasol, **mindkét** szótárba (`en`, `hu`) vedd fel az értéket a `src/i18n/index.ts`-ben, és használd a meglévő `t()` mintát.
- A brand-, jogi- és árazási döntések **üzleti jóváhagyást** igényelnek — ezeknél hagyj `// TODO(business):` jelölést, ha a tartalom nem végleges.

---

# 8. Élő ellenőrzés eredményei (futó szerveren, böngészőből)

> A `localhost:3000`-on futó dev szerveren, valós böngészőből végzett ellenőrzés. Cél: az auditban leírt megállapítások igazolása vagy cáfolása, és új, csak futás közben látható hibák feltárása.

## 8.1 Megerősített megállapítások (élesben igazolva)

| # | Megállapítás | Élő bizonyíték |
|---|---|---|
| 3 | **Nincs `<h1>` a landingen** | DOM-lekérdezés: `document.querySelectorAll('h1').length === 0`; a hierarchia H2→H3→H4. |
| 2 | **Hiányos SEO-meta** | `<title>="FormaReal"`, `description` **angol** (`"Architectural render realism enhancement…"`) miközben `htmlLang="hu"`; `og:title`, `og:image`, `canonical` mind **null**. |
| 4 | **Túlméretes, optimalizálatlan képek** | Friss letöltés (`cache:reload`): `logo.png = 4108 KB`, `hero-render-before.png = 2692 KB`, `hero-render-after.png = 2040 KB`, mind nyers `image/png`. A logó ~36 px-en jelenik meg. |
| 11 | **Nincs mobil navigáció** | A fejlécben egyetlen gomb a nyelvváltó; a szekciónav `hidden … xl:flex` (1280 px alatt eltűnik), nincs hamburger/menü-gomb. |
| 4.1 | **Lefordítatlan badge** | A hero alatt „Drag to compare · AI-enhanced result" **angolul** jelenik meg magyar nézetben is. |

## 8.2 Új, élőben felfedezett hibák

### 8.2.1 Belső hibaüzenet kiszivárgása a kliensnek — MAGAS (biztonság/hibakezelés)
A `POST /api/auth/register` hibás állapotban a **teljes belső stack trace-t** visszaadja a HTTP-válasz `error` mezőjében, benne:
- abszolút szerveroldali fájlútvonalak: `C:\Users\User\test_code\r2r_pro\.next\dev\server\chunks\…`
- Turbopack-modulnevek és Prisma-belső hívás (`prisma.user.findUnique() invocation`).

Ez információ-kiszivárgás (a támadó megismeri a szerver szerkezetét, a stacket, az ORM-et). **Feladat:** a `src/app/api/auth/register/route.ts`-ben (és a többi route-ban) a nem várt hibákat naplózd szerveroldalon (`console.error`), a kliensnek pedig csak generikus üzenetet adj vissza (`{ error: "A regisztráció átmenetileg nem érhető el." }`, HTTP 500) — soha ne a nyers `error.message`-t adatbázis-/rendszerhibáknál.

### 8.2.2 Nincs „adatbázis nem elérhető" kezelés — KÖZEPES (megbízhatóság/UX)
Amikor a Postgres-kapcsolat hibás (élő teszt: hitelesítési hiba), a `GET /api/auth/session` **HTTP 500**-at ad, ettől a kliensoldali guard végtelen/üres állapotba kerülhet, a `/login` és `/register` pedig használhatatlan. **Feladat:** vezess be egészség-/DB-állapot ellenőrzést és barátságos hibaképernyőt (pl. „A szolgáltatás átmenetileg nem elérhető"), valamint a session-route adjon 401-et (nem 500-at) DB-hibától függetlenül, ha a munkamenet nem állapítható meg.

### 8.2.3 `/login` és `/register` szerveroldali átirányítást ad — ELLENŐRIZENDŐ
Élő `fetch(redirect:'manual')` szerint a `/login` és `/register` is `opaqueredirect`-et (3xx) adott vissza, és a böngésző az `/app`-ra került. Ez lehet szándékos (bejelentkezett usert `/app`-ra irányít), de a jelenlegi DB-hiba mellett félrevezető viselkedést okozott. **Feladat:** a DB helyreállítása után újra kell ellenőrizni; ha az átirányítás munkamenet-független, az hiba (a kijelentkezett felhasználó soha nem éri el a regisztrációs űrlapot).

## 8.3 Környezeti megjegyzés (nem kód-hiba, de rögzítendő)
A lokális teszt során a Docker Postgres **adatkötete korábbi jelszóval** maradt fenn, ezért a Prisma „authentication failed" hibát adott — a `.env` `DATABASE_URL` jelszava egyébként helyes (egyezik a `docker-compose.yml`-lel). Ez a Postgres-kötet ismert viselkedése (a `POSTGRES_PASSWORD` csak üres kötetnél érvényesül). Megoldás: `docker compose down -v && docker compose up -d && npm run db:push && npm run db:seed`. **Javasolt termékfejlesztés:** a `README`/`DEPLOY` egészüljön ki ezzel a tipikus hibával és a reset-paranccsal, illetve a `db:push` fusson le automatikusan a dev indításakor, ha a séma hiányzik.

> **Folytatás:** az app belső felületeinek (dashboard, projekt, workspace, generálás, compare, export, megosztás) élő bejárása a DB helyreállítása után készül el — ez a szakasz akkor egészül ki a workspace tényleges működésének igazolásával.

## 8.4 Frissítés — megerősített gyökérokok (élő böngészős teszt)

### 8.4.1 Auth-átirányítási hiba — gyökérok azonosítva, MAGAS
A `/register` és `/login` **kijelentkezett állapotban is** az `/app`-ra irányít, ha a böngészőben létezik egy (akár elavult) `render2real_profile_id` süti. Forrás: **`src/proxy.ts`** (Next.js 16 middleware) a **`hasLocalProfileSessionCookie`** (`src/services/auth/auth-routing.ts`) segítségével **csak a süti meglétét** vizsgálja, az érvényességét (HMAC/lejárat) nem. Mivel az `/app` kliensoldali guardja viszont a `/api/auth/session`-nel **validál**, egy elavult sütivel rendelkező felhasználó örök `/register → /app → „jelentkezz be" guard` zsákutcába kerül, és **nem éri el a regisztrációs/login űrlapot**. (Élő teszt: `POST /api/auth/logout` törölte a sütit, utána a `/register` helyesen megjelent.)

**Feladat:** a `resolveAuthRedirect` ne irányítson el `/login`/`/register`-ről `/app`-ra pusztán a süti megléte alapján; vagy a guard-oldal kínáljon „Kijelentkezés és új belépés" útvonalat; vagy a middleware lejárt/érvénytelen süti esetén töröltesse a sütit és engedje az auth-oldalakat. (Fájlok: `src/proxy.ts`, `src/services/auth/auth-routing.ts`.)

### 8.4.2 Hibaszivárgás — vizuálisan igazolva, MAGAS
A regisztráció DB-hiba esetén egy **piros toastban a teljes belső hibát mutatja a végfelhasználónak**: abszolút szerver-útvonalak (`C:\Users\User\test_code\r2r_pro\.next\dev\server\chunks\…`), a forráskód sorai (`assertPasswordPolicy(input.password)`, `normalizeProfileEmail(...)`) és a Prisma-belső `user.findUnique()` hívás, plusz a pontos DB-hibaszöveg. Ez érzékeny információ. (Megerősíti a 8.2.1-et — nemcsak az API-válaszban, hanem a felhasználói felületen is megjelenik.)

**Feladat:** a `auth-form-card.tsx` `submit()` hibakezelése ne a nyers `error.message`-t mutassa toastként, hanem felhasználóbarát, lokalizált üzenetet (pl. „A regisztráció átmenetileg nem érhető el, próbáld újra később."); a részleteket csak szerveroldali logba.

### 8.4.3 Auth-űrlap nyelve — vizuálisan igazolva
A `/register` űrlap élesben **angolul** jelenik meg („Create free account", „Create a local SaaS pilot profile…", „Full name", „Email address", „Password (at least 8 characters)", „Create profile"), miközben a keret magyar („Vissza a főoldalra", „Már van profilod?"). Megerősíti a 3.4 / 4.3 megállapítást.

### 8.4.4 Hibás seed script — KÖZEPES (DX/telepítés)
A `prisma/seed.js` (1–3. sor) nem tölti be a `.env`-et, és ha a `DATABASE_URL` nincs a shell-környezetben, **SQLite-ra esik vissza**:
```js
if (!process.env.DATABASE_URL) { process.env.DATABASE_URL = "file:./dev.db"; }
```
Mivel a `schema.prisma` provider `postgresql`, az `npm run db:seed` (`node prisma/seed.js`) hibára fut: *„the URL must start with the protocol `postgresql://`"*. Ez a SQLite→Postgres migráció maradványa. **Feladat:** töröld a SQLite-fallbacket, és töltsd be a `.env`-et a seedben (pl. `import "dotenv/config"` vagy a Prisma CLI `prisma db seed` használata, amely automatikusan betölti). Pozitívum: a `ensureDefaultPresets()` (`src/app/api/projects/route.ts` GET) futáskor pótolja a preseteket, így a seed kihagyása nem blokkoló — de a `db:seed` jelenleg félrevezetően hibás.

## 8.5 Teljes magfolyamat — élő, végponttól végpontig tesztelve ✓

A DB helyreállítása után (lásd 8.6) a **teljes alap-munkafolyamat hibátlanul lefutott** valós böngészőben, bejelentkezett felhasználóval. Ez megerősíti, hogy a termék magja működőképes:

| Lépés | Eredmény | Megjegyzés |
|---|---|---|
| Regisztráció (`/register`) | ✓ | Profil létrejött, átirányítás `/app`-ra. |
| Belépési guard | ✓ | Kijelentkezve a guard helyesen jelenik meg. |
| Dashboard (`/app`) | ✓ (de üres) | Csak hero + „Új projekt" űrlap — **igazolja az 5.1-et** (nincs metrika/legutóbbi projekt/analitika). |
| Admin menüpont sima usernek | ⚠ látszik | **Igazolja a 3.6/5.7 jogosultsági rést**: a frissen regisztrált `teszt@example.com` látja az „Admin" menüt. |
| Projekt létrehozás | ✓ | „Ipari Csarnok – Teszt" létrejött, belépés a workspace-be. |
| Kép feltöltés (`UploadDropzone`) | ✓ | `test-render.png` (1280×720) feltöltve, „Eredeti" verzió mentve. |
| Generálás (`mock-local`) | ✓ | „realizmus-passz elkészült" **1560 ms** alatt; 2. verzió mentve, előnézet a vignetta/kontraszt effekttel. |
| Verzióelőzmény | ✓ | Eredeti + Realizmus-passz, időbélyeggel, „Generált"/„Mentve" badge-ekkel. |
| Összehasonlítás | ✓ | Generálás után automatikusan bekapcsol. |
| Megosztási link + nyilvános nézet (`/share/[token]`) | ✓ | A publikus oldal helyesen mutatja a before/after csúszkát és a verzió-badge-eket. |

**Megerősített hiányosságok az élő bejárás során (nem blokkolók, de audittételek):**
- A megosztó oldal (`/share/[token]`) **footere nem link** a landingre — kimaradt akvizíciós csatorna (**4.5**). A csúszka címkéi (`ORIGINAL RENDER` / `AI-ENHANCED RESULT`) és a „Drag to compare" tipp **angolul** jelennek meg magyar projektnél is.
- A workspace jobb panele a vártnak megfelelően **nagyon sűrű** (verziók, generálás, preset, prompt, minőség, upscaling, előzmény, metaadat egy oszlopban) — **igazolja az 5.3 UX-megállapítást**.

> **Nem tesztelt élőben:** az export-letöltés (böngészős fájl-letöltés), a batch generálás, az inpainting/„Anyagszerkesztő", a valós `fal-controlnet` generálás (a teszthez `mock-local`-ra váltottam). Ezek statikus kódelemzés alapján szerepelnek az 5.3-ban.

## 8.6 A teszthez végrehajtott környezeti változtatások (visszafordítható)

A futtatás érdekében az alábbi **lokális konfigurációs** módosításokat végeztem (a forráskódot **nem** érintették):
1. `docker-compose.yml`: a Postgres portja `5432:5432` → **`5433:5432`** — mert az 5432-n egy másik (natív) Postgres ült, ami hitelesítési hibát okozott.
2. `.env`: `DATABASE_URL` host `localhost:5432` → **`localhost:5433`** (az új porthoz).
3. `.env`: `RENDER2REAL_ACTIVE_PROVIDER` `fal-controlnet` → **`mock-local`** (hogy kredit és külön Python-szerviz nélkül teszteljük a folyamatot).

**Visszaállítás:** ha leállítod az 5432-es natív Postgrest, visszateheted az 5432-es portot mindkét fájlban; a providert pedig `fal-controlnet`-re, ha valós AI-generálást szeretnél (ehhez a `RENDER2REAL_API_URL` Python-szervizt is futtatni kell — jelenleg `http://localhost:3000`-ra mutat, ami maga a Next app, ezt érdemes felülvizsgálni).
