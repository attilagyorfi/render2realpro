# FormaVeris — Teljes körű működési, UI/UX és mobilbarát audit

**Készítette:** Claude (Fable 5) — automatizált kódbázis- és funkcióaudit
**Dátum:** 2026-06-12
**Vizsgált állapot:** `main` @ `02c34a3` (Sprint A–F lezárva)
**Módszertan:** 4 párhuzamos mélyvizsgálat (mobil/responsive, i18n, funkcionális, a11y/UX) + kézi ellenőrzés a kritikus útvonalakon + a 2026-06-08-as G2A-audit nyitott tételeinek újraellenőrzése.

---

## 0. Vezetői összefoglaló

A kódbázis mérnökileg rendezett: a regisztráció-jóváhagyási folyamat (Munkacsomag 2) **a kódban hiánytalanul kész és helyes**, az Anyagszerkesztő (Munkacsomag 3) implementált, a biztonsági alapok (HMAC session, bcrypt, admin role-check, hibaüzenet-sanitizálás) állnak. **A három legnagyobb kockázat ma:**

1. **A fő funkció (globális realizmus-passz) éles működése nem igazolt.** A `flux-general/image-to-image` átállás 422-javítása fel van töltve, de felhasználói megerősítés még nincs róla, hogy az eredmény minősége elfogadható. Amíg ez nincs validálva, a termék fő ígérete kérdéses.
2. **Az alkalmazás mobilon gyakorlatilag használhatatlan.** Bejelentkezett felhasználónak mobilon **nincs navigációja** (a teljes menü `hidden md:flex`), a workspace 3 oszlopos rácsa csak 1280px felett áll össze, és a maszk-festés / textúra-kijelölés **csak egérrel** működik (nincs touch-támogatás).
3. **Élesítés előtti biztonsági hiányok:** nincs rate-limit a loginon, nincsenek biztonsági fejlécek (CSP, X-Frame-Options, HSTS), nincs párhuzamosság-védelem a generáláson.

A javítások négy ütemre bonthatók; az **U0 (validáció) + U1 (mobil + biztonság)** együtt kb. **3-4 munkanap**, és utána a termék pilot-élesítésre alkalmas.

---

## 1. Ami KÉSZ és helyesen működik (a kód alapján igazolva)

| Terület | Állapot | Bizonyíték |
|---|---|---|
| Regisztráció → pending → admin email → jóváhagyás/elutasítás → belépés-kapu | ✅ Teljes | `login/route.ts:31-51` státusz-kapu jelszó-ellenőrzés UTÁN (nincs user-enumeration); token egyszer használatos + lejár (`registration-approval.ts:33-51`); admin lista + gombok (`admin-view.tsx:66-217`) |
| HMAC-aláírt session, bcrypt jelszó, admin role + 403 | ✅ | Sprint 2.2–2.3 + A.1 |
| Hibaüzenet-sanitizálás (nincs stack-trace kiszivárgás) | ✅ | Minden auth/admin/texture route generikus 500-at ad, részlet csak szerver-logba |
| Anyagszerkesztő: maszk + szabad prompt + Fal Fill + pixel-pontos kompozit | ✅ implementált (minőség-validáció függőben) | `texture-targeting-job-service.ts` — maszkon kívül bitre-bitre az eredeti |
| Képoptimalizálás a landingen | ✅ | logó 4,2 MB → 4,7 KB; hero képek webp 70–120 KB |
| Landing mobil hamburger-menü | ✅ | `landing-view.tsx:573-628` (Sheet) |
| SEO-alap: H1, metadataBase, OG/Twitter, sitemap, robots, noindex az auth/share oldalakon | ✅ | Sprint C |
| Route-konszolidáció (`/app/*` kanonikus, legacy redirectek) | ✅ | Sprint D |
| ÁSZF/Adatkezelés checkbox + jogi placeholder oldalak | ✅ (tartalom ügyvédre vár) | Sprint C.6 + D |
| CI: lint + typecheck + teszt + production build minden pushon | ✅ | `.github/workflows/ci.yml` |

---

## 2. KRITIKUS hibák — P0 (élesítés-blokkolók)

### P0.1 — A globális realizmus-passz minősége nem validált
**Tünet:** az utolsó két élő teszt elfogadhatatlan eredményt adott (újratervezett épület), azóta modellváltás történt (`flux-general/image-to-image`, strength 0.4, XLabs Canny ControlNet), de a 422-javítás utáni futás eredményét még senki nem látta.
**Teendő:** kézi validáció a teszt-renderrel. Ha az eredmény jó → P0.1 lezárva. Ha nem → `FAL_STRENGTH` iteráció (0.25 / 0.3 / 0.5), és ha úgy sem: a globális gomb átminősítése "finomítás"-ra (mock-local), a fő AI-érték az Anyagszerkesztő marad.
**Becslés:** 0,5–2 óra (iterációtól függően).

### P0.2 — Bejelentkezett felhasználónak mobilon nincs navigáció
**Hely:** `app-frame.tsx:112-114, 171-176` — a teljes nav és a profil-chip `hidden md:flex`, mobil alternatíva nincs.
**Hatás:** telefonon a belépett user csak a logót és a nyelvváltót látja; Vezérlőpult/Projektek/Beállítások/Admin elérhetetlen.
**Teendő:** hamburger + Sheet-alapú mobil menü (a landing mintájára), benne a nav-elemek + profil + kijelentkezés.
**Becslés:** 3-4 óra.

### P0.3 — Workspace mobilon/tableten használhatatlan
**Hely:** `workspace-view.tsx:1048-1052` — `xl:grid-cols-[240px_1fr_340px]`, xl alatt minden egymás alá esik, a vezérlőpanel gyakorlatilag elérhetetlen mélységbe kerül.
**Teendő:** mobil nézetben tab-os vagy alulról felhúzható (drawer) elrendezés: [Vászon] / [Vezérlők] / [Fájlok] váltófülek.
**Becslés:** 1 nap.

### P0.4 — Maszk-festés és textúra-kijelölés touch-eszközön nem működik
**Hely:** `inpainting-canvas.tsx:127-139` és `texture-canvas.tsx:57-100` — csak `onMouse*` handlerek, `onTouch*`/pointer-events nélkül.
**Hatás:** a termék fő értéke (Anyagszerkesztő) tableten — ami építész-irodában tipikus eszköz — nem használható.
**Teendő:** pointer-events átállás (a `comparison-view.tsx:70-88` már jó minta).
**Becslés:** 2-3 óra.

### P0.5 — Nincs rate-limit az auth végpontokon + nincsenek biztonsági fejlécek
**Hely:** `api/auth/login`, `api/auth/register` — korlátlan próbálkozás; `next.config.ts`/`proxy.ts` — nincs CSP, X-Frame-Options, HSTS, X-Content-Type-Options.
**Teendő:** egyszerű in-memory (vagy DB-alapú) IP+email számláló a loginon (pl. 5 hiba / 15 perc → 429), + `headers()` blokk a `next.config.ts`-ben.
**Becslés:** 3-4 óra.

### P0.6 — Generálás közben nincs megszakítás és rossz az időbecslés
**Tünet (élő tesztből):** 4+ perces pörgés megszakítási lehetőség nélkül; a becslő 90–210 mp-re kalibrált, miközben az img2img ~15-30 mp, az inpainting ~15 mp — a "95%-on ragadás" élmény garantált.
**Hely:** `workspace-view.tsx:311-393` (heurisztika), nincs AbortController a kliens fetch-en.
**Teendő:** (a) Mégse gomb (AbortController + a szerver oldali fetch timeout már létezik), (b) becslések providerenként: img2img ~30s, inpainting ~20s, mock ~2s, (c) "becsült" felirat.
**Becslés:** 3-4 óra.

---

## 3. MAGAS prioritás — P1 (első éles hét)

| # | Hiba | Hely | Becslés |
|---|---|---|---|
| P1.1 | **Angol API-hibaüzenetek a toastokban** ("Registration is temporarily unavailable…" stb. 5 route-ban) — sentinel-kód + kliens-oldali i18n map kell (a minta már él: AUTH_ACCOUNT_PENDING) | `auth/register:76`, `auth/login:55`, `admin/registrations:22`, `admin/presets:28`, `texture-targeting/apply:84` | 2 ó |
| P1.2 | **Admin felület angol fejléccel** ("Platform administration", "Tenant overview", "Usage governance") | `admin-view.tsx:399,490,501` | 1 ó |
| P1.3 | **Natív `confirm()` törlésnél** (nem akadálymentes, nem stílusos) → Dialog | `admin-view.tsx:466`, `workspace-view.tsx:1092` | 2-3 ó |
| P1.4 | **Ikon-gombok aria-label nélkül** (zoom, törlés, bezárás, szerkesztés — 10 db) | `workspace-view.tsx` (8), `admin-view.tsx` (2) | 1 ó |
| P1.5 | **Félrevezető slider-modell:** a 10 szín/fény csúszka CSAK CSS-előnézet, az AI-generálásra nincs hatással, de a UI ezt nem mondja ki (sőt: "Az aktív preset és beállítások alapján") | `workspace-view.tsx:851-868` vs `:656-659` | 0,5 ó (címke) |
| P1.6 | **Megosztás-dialógus** fix 420px széles, `absolute` pozícióval, nem Dialog-primitív (mobilon kilóg, nincs Escape/focus-trap) | `workspace-view.tsx:1159-1166` | 2 ó |
| P1.7 | **Párhuzamos generálás versenyhelyzet:** ugyanarra az assetre két egyidejű kérés ütközhet → egyszerű in-flight zár (status==="processing" → 409) | `image-processing-service.ts` | 2 ó |
| P1.8 | **Drag-reorder elveszik újratöltéskor** — vagy perzisztálni (ImageAsset.sortOrder + PATCH), vagy a funkciót elrejteni | `workspace-view.tsx:500,581-600` | 3 ó / 0,5 ó |
| P1.9 | **Export-méretezés zavaros ternary** (`717-718`) — refaktor + egységteszt az 1×/2×/4× skálára | `workspace-view.tsx:717-718` | 1-2 ó |
| P1.10 | **Egyedi toggle-ök `role="switch"`/`aria-checked` nélkül** (3 db) | `workspace-view.tsx:1541,1611,1690` | 1,5 ó |
| P1.11 | **LCP-figyelmeztetés a workspace képen** (konzolban igazolt) — `priority`/`loading="eager"` a fold feletti képre | workspace fő képpanel | 0,5 ó |

**P1 összesen: ~2 munkanap.**

---

## 4. KÖZEPES prioritás — P2 (élesítés utáni 2-3 hét)

| # | Tétel | Megjegyzés | Becslés |
|---|---|---|---|
| P2.1 | **Workspace jobb panel akkordeonba rendezése** — most 8 szekció egy hosszú görgethető oszlopban; első használatra ijesztő | Csoportok: Generálás / Finomhangolás (előnézet) / Verziók / Előzmény+metaadat; alapból csak Generálás nyitva | 0,5-1 nap |
| P2.2 | **Inline összehasonlítás** — a Compare most kényszerített fullscreen | fullscreen opcióként maradjon | 2-3 ó |
| P2.3 | **Dashboard feltöltése** — metrikakártyák (a `metric-card.tsx` kész, csak nincs bekötve) + "Legutóbbi projektek" lista + folytatás-linkek | adatforrás: /api/projects + /api/logs vagy új /api/stats | 1 nap |
| P2.4 | **Beállítások oldal tartalma** — most placeholder; kell: profil (név/email/jelszóváltás), nyelv, fiók-műveletek (GDPR: adatletöltés, törlés) | /api/auth bővítéssel | 1-2 nap |
| P2.5 | **Elfelejtett jelszó flow** — most nincs önkiszolgáló helyreállítás (a Resend-infrastruktúra már kész, csak a token-flow kell) | reset-token mező + 2 endpoint + email-template | 0,5-1 nap |
| P2.6 | **i18n-konszolidáció** — 156+ inline `language === "hu"` ternary átvitele a `t()` szótárba (főleg workspace-view) | fokozatosan, fájlonként | 1-2 nap |
| P2.7 | **Landing CompareSlider csere** az akadálymentes `ComparisonView`-ra (billentyűzet-támogatás + duplikáció-megszüntetés) | `landing-view.tsx:75-136` | 1-2 ó |
| P2.8 | **/preview valódi képernyőképekkel** — most 1 db 14 KB-os teszt-render + szöveges kártyák; a "Termékbemutató" CTA-ígéret gyenge | /public/preview/*.webp készítése a kész felületekről | 0,5 nap |
| P2.9 | **Share-oldal akvizíciós CTA + i18n** — a nyilvános megosztás footeréből hiányzik a "Készítsd te is" link; a címkék (ORIGINAL RENDER) hard-coded | `share-view.tsx` | 2 ó |
| P2.10 | **Schema-szigorítás** — `Project.userId` és `User.passwordHash` NOT NULL-ra (backfill után), `ImageAsset.sortOrder` ha a P1.8 a perzisztálást választja | migrációval | 2 ó |

**P2 összesen: ~1,5 hét.**

---

## 5. ALACSONY prioritás / hosszú táv — P3

1. **Analytics + cookie-consent** (Plausible/PostHog EU; események: signup, generation, export, share) — a marketing-funnel ma mérhetetlen.
2. **Jogi tartalmak véglegesítése ügyvéddel** (a placeholder oldalakon `TODO(business)` áll).
3. **Valódi job-queue** (DB-alapú vagy BullMQ) — batch-megbízhatóság, valós progressz, several-user skálázás.
4. **Témaváltó** (a `common.light/dark` kulcsok léteznek, de a sötét téma hard-coded a `layout.tsx:64`-ben) — vagy a kulcsok törlése.
5. **SAM2 / szövegvezérelt automatikus maszk** (Munkacsomag 3 fázis 2) — "kattints a tetőre" élmény a kézi ecset helyett.
6. **S3/R2 storage-backend** — ha a Railway-volume szűk lesz.
7. **Lead-pipeline** (Studio/Enterprise formok + CRM) és social proof a landingen — a 06-08-as audit konverziós tételei továbbra is nyitottak.
8. **Tauri desktop csomagolás** — a monetizációs B-opcióhoz.

---

## 6. Javasolt ütemterv

| Ütem | Tartalom | Időigény | Eredmény |
|---|---|---|---|
| **U0 — Validáció** (most) | P0.1: img2img élő teszt + strength-iteráció | 0,5-2 ó | A fő funkció minősége eldől |
| **U1 — Mobil + biztonság** | P0.2–P0.6 | 2-3 nap | Mobilbarát app-shell és workspace, touch-támogatás, rate-limit, fejlécek, megszakítható generálás |
| **U2 — Csiszolás** | P1.1–P1.11 | 2 nap | Konzisztens magyar UI, akadálymentes alapok, race-védelem |
| **U3 — Termékélmény** | P2.1–P2.10 | 1,5 hét | Akkordeonos workspace, élő dashboard, működő beállítások, jelszó-reset |
| **Folyamatos** | P3 tételek üzleti prioritás szerint | — | Analytics, jogi, queue, desktop |

**Pilot-élesítés (Railway) az U1 után már vállalható**, az U2 erősen ajánlott hozzá.

---

## 7. Kézi tesztelési checklist (release előtt minden alkalommal)

1. Regisztráció → pending panel → admin email (konzol/Resend) → jóváhagyó link → visszaigazoló email → belépés. Elutasítás-ág is.
2. Pending user belépési kísérlete → "jóváhagyásra vár" üzenet (nem enged be).
3. Projekt + feltöltés + **Automatikus javítás** (Fal img2img) → az eredmény kompozíció-hű? Idő < 60s?
4. **Anyagszerkesztő**: maszk a tetőre + "piros fémtető" → CSAK a tető változik; before/after automatikusan bekapcsol.
5. Megosztási link inkognitóban + lejárt/visszavont link → 410/404.
6. Export 1×/2× PNG/JPG/WEBP — a letöltött fájl mérete helyes.
7. Mindez **375px széles nézetben** (DevTools mobil emuláció) és lehetőség szerint valódi tableten is.
8. `npm run lint && npm run typecheck && npm run test && npm run build` zöld.

---

*A hivatkozott sorszámok a `02c34a3` commit állapotára vonatkoznak. A korábbi (2026-06-08) G2A-audit tételei közül a kritikusok (brand, SEO, képméret, admin-jogosultság, H1, mobil landing-nav, hibaszivárgás, auth-redirect csapda, seed) lezárva; a nyitva maradtak ebbe a dokumentumba átemelve aktualizált prioritással.*
