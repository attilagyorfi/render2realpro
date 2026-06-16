# FormaReal → „rendair-szint" — Fejlesztési Terv

> **Referencia (követendő példa):** https://rendair.ai/
> **Cél-szoftver:** FormaReal / Render2Real Pro — `C:\Users\User\test_code\r2r_pro` (Next.js 16, React 19, Prisma + PostgreSQL, Fal.ai)
> **Készítette:** senior fejlesztői nézőpont — teljes rálátással, csapatra delegálva
> **Dátum:** 2026-06-16
> **Nyelv:** magyar; a kód-szintű javaslatok a meglévő FormaReal fájlokra hivatkoznak.

---

## 0. Hogyan olvasd ezt a dokumentumot

Ez egy **végrehajtható fejlesztési terv**, nem prezentáció. Úgy van felépítve, ahogy egy senior dev átadná a munkát a csapatnak:

- Minden nagy funkciónál szerepel: **mit csinál a rendair**, **mi van most a FormaReal-ben** (konkrét fájl), **mit kell építeni**, **ki a felelős szerep**, **méret/becslés**, **prioritás**.
- A szerepkörök: **AI/ML**, **Backend (BE)**, **Frontend (FE)**, **UX/UI**, **DevOps**, **Product/Growth**, **QA**. Egy 1-3 fős csapatnál ezek a kalapok ugyanazon a fejen is lehetnek — a delegálás logikai, nem létszámfüggő.
- A **4. fejezet a legfontosabb**: a generálási minőség problémája (a Te fő fájdalmad). Ha csak egy dolgot olvasol el, ez legyen az.
- A fázisozott ütemterv a **8. fejezetben** van (MVP → közép → nagy).

Fontos keret: a rendair **érett, széles, többfunkciós** termék (chat, videó, upscaling, sokféle input, 500k user). A FormaReal **fókuszált, egyszálú** render-realizmus eszköz. A cél nem az 1:1 klónozás, hanem a **legnagyobb értékű elemek átemelése** a megfelelő sorrendben — előbb a minőség, aztán a felhasználói élmény, végül a piaci szélesség.

---

## 1. Vezetői összefoglaló

**Hol tart most a FormaReal a rendairhez képest?** A váz erős (projektek, verziók, compare, megosztás, provider-absztrakció, prompt-engine, fidelity-scoring), de a termék **egyetlen szűk folyamatra** képes: render-kép feltöltés → Flux ControlNet Canny „realizmus-passz" → összehasonlítás/export. A rendair ehhez képest egy **AI-asszisztens platform**: beszélgetős szerkesztés, sokféle bemenet (vázlat, alaprajz, 3D-modell, metszet, homlokzat, szöveg), instant edit, variációk, művészi stílusok, upscaling, **videó**, és vertikális use-case-ek (belső, tájépítészet, staging).

**A 3 legnagyobb tét, sorrendben:**

1. **A generálási minőség (KRITIKUS).** A Te szavaiddal: „nem hozza a várt eredményt, és bárhogy próbálok javítani, nem lesz jobb." Ez **nem UI-probléma** — a Canny-only ControlNet pipeline és a prompt/paraméter-hangolás a szűk keresztmetszet. A 4. fejezet erre ad konkrét, mérhető újratervezést. **Ezt kell előbb megoldani**, mert e nélkül minden más funkció csak rossz képeket gyárt gyorsabban.
2. **A munkamenet-paradigma (MAGAS).** A rendair fő differenciátora a **beszélgetős (chat) szerkesztés**: a felhasználó természetes nyelven kér módosítást, és iterál. A FormaReal merev preset+slider modellje ezt nem tudja. Ez a legnagyobb UX-átalakítás.
3. **A bemeneti szélesség és a finishing (KÖZÉP).** Vázlat/alaprajz/3D/szöveg → render, plusz upscaling és variációk. Ezek nyitják meg a piacot a puszta „render-szépítésen" túl.

**Mit NE csinálj most:** videó-generálás, csapatmunka, kredit-billing, 3D-plugin ökoszisztéma — ezek értékesek, de csak akkor, ha a mag (minőség + chat-szerkesztés) már működik. Korai bevezetésük szétszórja az erőforrást.

---

## 2. rendair.ai — elemzés

### 2.1 Pozicionálás és üzleti modell
- **Üzenet:** „Your AI rendering assistant. Built for architects. Show concepts easily and get client approvals faster." — gyors koncepció-vizualizáció és gyorsabb ügyfél-jóváhagyás.
- **Social proof:** „500,000+ architects", „Trusted by: BIG, SOM, Perkins&Will, Vitra, Zaha Hadid Architects", rengeteg névvel ellátott vélemény. (A FormaReal-ben nulla referencia — lásd a korábbi audit.)
- **Üzleti modell:** **kredit-alapú** előfizetés. Student €9,50 (250 kredit), Creator €19 (500), Pro €49 (1500, „Best value", sor-átugrás, x4 párhuzamos generálás, privát mód, kereskedelmi licenc, havi személyes tréning), Team Pro €200 (7500, +4 csapattag). A „text-to-image" korlátlan; az image creation/edit/upscale/video kreditet fogyaszt. **A fel nem használt kredit nem jár le** aktív előfizetés mellett.
- **Egyéb bizalom/retenció:** Book a demo, Enterprise, Prompt Gallery, Rendair Academy, affiliate, Trust Center, többnyelvűség (EN/ES/FR/IT/PT), privát mód (titoktartás), kereskedelmi licenc.

### 2.2 Termékfunkciók (a rendair saját bontásában)
- **Rendair Chat** — beszélgetős AI: generálás, szerkesztés, javítás természetes nyelven. (Flagship.)
- **Create & Render** — rajz/3D-modell → fotórealisztikus kép „másodpercek alatt".
- **Edit & Adjust** — bármely képrész azonnali módosítása (anyag, felület, bútor).
- **Upscale & Enhance** — élesítés, prezentációkész felbontás.
- **Video & Animate** — statikus renderből sima, realisztikus videó/bejárás.
- **Image Variations** — „endless variations with one click": hangulatok, fények, atmoszférák.
- **Artistic styles** — realizmuson túl: akvarell, vázlat stb.

### 2.3 Bemeneti modalitások („Tools")
`Text To Render` · `Sketch To Render` · `Floorplan To Render` · `3D Model To Render` · `Elevation To Render` · `Section To Render` · `Image To Render` · `Design Landscape` · `Upscale Images` · `CAD To Render`.
→ A FormaReal ma **csak `Image To Render`-t** tud (kész render feltöltése). Ez a legnagyobb funkcionális rés.

### 2.4 Vertikumok / use-case-ek
Architecture · Interior · Landscape · Design · Staging; plusz szoba-szintű generátorok (fürdő, konyha, háló, nappali, kert, hotel lobby stb.). 3D-integrációk: Rhino, Grasshopper, Vectorworks, Blender, AutoCAD, SketchUp, ArchiCAD.

### 2.5 UI/UX és tech
- **Marketing oldal:** **Framer**-rel épült (no-code) — sötét navy téma, narancs CTA-akcent, nagy bold display tipográfia, **before/after csúszkák** mindenhol, interaktív „Generate" demó a hős alatt.
- **A termék (app):** külön SPA, a kulcs-UX a **vászon + alatta chat-input sáv** („+ A … ↑": kép-csatolás + prompt + küldés). A munkamenet beszélgetés-szerű, nem űrlap-szerű.
- A FormaReal dizájn-nyelve (sötét téma, kék/lila akcent, before/after `ComparisonView`) **közel áll** ehhez — a váltás inkább interakciós (chat), mint vizuális.

---

## 3. Gap-elemzés: rendair képesség → FormaReal jelenlegi állapot → teendő

| rendair képesség | FormaReal MA (fájl) | Rés | Teendő (fejezet) |
|---|---|---|---|
| **Fotórealisztikus minőség** „másodpercek alatt" | Flux ControlNet **Canny** realizmus-passz (`src/services/providers/*fal*`) | A kimenet gyenge/merev; Canny-only túl- vagy alulköti a geometriát | **§4 — pipeline újratervezés (KRITIKUS)** |
| **Chat-alapú szerkesztés** (NL) | Nincs; merev preset + 10 slider + custom prompt textarea (`workspace-view.tsx`) | Nincs iteratív, beszélgetős szerkesztés | §5.1 |
| **Több bemenet** (sketch/floorplan/3D/text/elevation/section/CAD) | Csak kész render upload (`UploadDropzone`) | Csak `Image To Render` | §5.2 |
| **Edit & Adjust** (instant, NL-vezérelt inpaint) | Legacy texture-targeting / inpainting Python szervizen át (`inpainting-canvas.tsx`, `RENDER2REAL_API_URL`) | Nehézkes, külön szerviz, nem NL | §5.3 |
| **Variations** (one-click hangulat/fény) | Nincs (egy generálás = egy kimenet) | Nincs felfedezés/A-B | §5.4 |
| **Artistic styles** | Csak „realizmus" presetek | Nincs stílus-tartomány | §5.5 |
| **Upscale & Enhance** | Opcionális 2× toggle (`enableUpscaling`, fal creative-upscaler) | Nincs dedikált finishing-lépés/UX | §5.6 |
| **Video & Animate** | Nincs | Teljes hiány | §5.7 (későbbi fázis) |
| **Vertikumok** (interior/landscape/staging) + use-case presetek | Csak építészeti exteriőr-orientált presetek | Szűk piac | §5.8 |
| **Kredit/billing** | Nincs | Nincs monetizáció | §5.9 (későbbi fázis) |
| **Social proof / referenciák** | Nulla (audit) | Bizalomhiány | §5.10 + a korábbi audit |
| **3D-plugin integrációk** | Nincs (csak logók a landingen) | Nincs valódi integráció | §5.11 (jövő) |
| **Privát mód / kereskedelmi licenc / többnyelvűség** | i18n váz megvan (`src/i18n`); privát mód nincs | Részleges | §5.12 |
| **Projektek/verziók/compare/megosztás** | **Megvan és jó** (`prisma`, `ComparisonView`, share token) | — | Megtartani, ráépíteni |

---

## 4. A generálási minőség újratervezése — a fő probléma (KRITIKUS)

> Ez a fejezet a Te fő fájdalmadra válaszol: „a render→élethű kép nem hozza a várt eredményt, és bárhogy javítok rajta, nem lesz jobb." A rendair „breathtaking quality"-t kap; a FormaReal nem. A különbség **nem a UI, hanem a generálási pipeline és annak hangolása**.

### 4.1 Miért nem jó most a kimenet — diagnózis

A FormaReal jelenlegi magja: **Fal.ai Flux + ControlNet Canny**, magas „control weight"-tel, a „No redesign, only realism" szabály jegyében (lásd `README`, `FAL_CONTROL_WEIGHT`, `FAL_INFERENCE_STEPS`, `FAL_GUIDANCE_SCALE`). Ennek tipikus következménye **strukturálisan**:

1. **Canny-only túlkötés.** Egy tiszta CAD-renderből a Canny rengeteg éles élt ad. Magas conditioning scale mellett a modell „kiszínezi a vonalrajzot", de nem mer fotórealisztikus anyagot/fényt tenni rá → lapos, „majdnem ugyanaz" eredmény. Alacsony scale mellett viszont **elúszik a geometria** → sérül a „no redesign" ígéret. A Canny egyetlen csatornán próbál egyszerre két célt szolgálni, és egyik végén sem jó.
2. **Hiányzó mélység/szemantika.** Az építészeti realizmushoz **depth** (térbeli mélység) és **szegmentáció/MLSD** (egyenes élek, síkok) sokkal erősebb kondicionálás, mint a Canny. Canny nem tudja, mi az „ég", „üveg", „beton" — csak éleket lát.
3. **Egylépéses pipeline.** A rendair-szintű minőség jellemzően **több lépés**: struktúra-megőrző generálás → realizmus/anyag-finomítás (img2img mérsékelt denoise-zal) → upscale → detail-pass. A FormaReal egyetlen passzból próbál mindent.
4. **Gyenge prompt + nincs negatív prompt.** A prompt-engine (`src/features/prompt-engine`) preservation-szabályokra fókuszál, de a fotorealizmus a **pozitív** (anyag, fény, kamera, optika, idő, időjárás) és **negatív** (CGI-look, plasztik, elmosódás, torzítás) promptokon múlik. Negatív prompt nélkül „render-szagú" marad.
5. **Nincs minőség-visszacsatolás.** A `fidelity-badge.tsx` jelez egy pontszámot, de nincs **automatikus újrapróbálkozás** rossz eredménynél, és nincs A/B-választás.

### 4.2 Cél-pipeline (mit építsünk helyette)

**Felelős: AI/ML (vezető), BE (integráció), QA (kiértékelés). Méret: L. Prioritás: KRITIKUS.**

Új, **többlépéses, kondicionálás-gazdag** pipeline. A FormaReal provider-absztrakciója (`src/services/providers/*`) pont erre való — egy új `fal-arch-v2` (vagy hasonló) adaptert vezessünk be a meglévő interfész mögött, hogy a régi út fallbackként megmaradjon.

**Lépések:**

1. **Bemenet-előkészítés és kontroll-térképek.** A forrásképből generálj **depth** + **canny/MLSD** (egyenes élek) kontroll-térképet. Építészetnél a `depth + edge` kombináció a nyerő. (Fal.ai-n elérhetők ControlNet/„union" modellek; ahol nincs, ott Replicate/ComfyUI-backend is opció — lásd §4.5.)
2. **Strukturált generálás.** Flux (vagy SDXL-archviz) ControlNet **két kontroll-térképpel**, **kalibrált** súllyal: az él-kontroll közepes (≈0,55–0,7), a depth közepes-magas (≈0,6–0,8). A cél: geometria marad, de van szabadság a fotorealizmushoz.
3. **Realizmus-finomítás (img2img refine).** A struktúra-kimeneten egy **mérsékelt denoise** (≈0,25–0,4) img2img-passz erős „photographic" prompttal — ez adja a valódi anyag-/fény-minőséget, miközben a kompozíció marad.
4. **Upscale + detail.** A meglévő `enableUpscaling` (fal creative-upscaler) legyen a **finishing** alapértelmezett utolsó lépése (nem opcionális mellék-toggle), tile-alapú upscalinggal a részletekért.
5. **Fidelity-gate.** A `fidelity-badge` logikáját kösd **automatikus kapuhoz**: ha a geometriai eltérés > küszöb (pl. SSIM/edge-IoU a forrás él-térképéhez képest), **automatikus újrapróbálkozás** kicsit magasabb kontroll-súllyal. 2-3 jelölt generálása és a legjobb fidelity-jű kiválasztása (a „x4 generations at once" rendair-funkció csírája).

### 4.3 Prompt-engine fejlesztés
**Felelős: AI/ML + BE. Méret: M. Prioritás: KRITIKUS.**

A `src/features/prompt-engine`-t bővítsd ki úgy, hogy minden generáláshoz **strukturált, fotografikus** promptot állítson elő:
- **Pozitív building blockok:** anyagok (megrendelő/preset szerint), fényviszony (golden hour / overcast / éjszakai), optika („shot on 24mm tilt-shift, architectural photography, f/8"), környezet (ég, növényzet, emberek léptékhez), render-engine-mentes megfogalmazás („photograph", nem „render").
- **Negatív prompt** (új, eddig hiányzott): `cgi, 3d render, plastic, lowpoly, blurry, distorted geometry, warped lines, oversaturated, fisheye, extra windows, hallucinated buildings`.
- **Preset → prompt leképezés:** a 10 meglévő preset (`prisma/seed.js`, `src/config/presets.ts`) kapjon valódi prompt-sablonokat, ne csak slider-értékeket. A workspace sliderek (`sliderControls`) **valóban** befolyásolják a generálást (ma csak CSS-előnézeti szűrő — lásd korábbi audit 5.3), pl. a „realismIntensity" → denoise-erősség, „shadowStrength" → fény-prompt.

### 4.4 Kalibrációs és kiértékelési keret (hogy „javuljon, ne romoljon")
**Felelős: QA + AI/ML. Méret: M. Prioritás: KRITIKUS (ez oldja meg a „bárhogy javítok, nem jobb" problémát).**

A jelenlegi javítgatás azért nem vezet sehová, mert **nincs objektív mérce**. Vezessünk be egy **eval-harnesst**:
- **Aranyhalmaz:** 15-25 valós forrás-render (exteriőr, interiőr, ipari, lakó), mindegyikhez egy „kívánt" referencia-érzet.
- **Metrikák:** (a) **geometria-megőrzés** — edge-IoU / SSIM a forrás él-térképéhez; (b) **fotorealizmus** — egy no-reference esztétikai pontszám (pl. CLIP-aesthetic vagy egy „photo vs render" klasszifikátor); (c) **prompt-illeszkedés** — CLIP-similarity a célstílushoz.
- **Folyamat:** minden pipeline-/paraméterváltozást az aranyhalmazon futtass le, és **számszerűsítve** hasonlítsd. Egy egyszerű script (`scripts/eval-pipeline.js`) + egy HTML-riport (a meglévő `coverage`-mintára). Így a hangolás **mérhető**, nem érzésre megy.

### 4.5 Modell-/szolgáltató-döntés
**Felelős: AI/ML + DevOps. Méret: M. Prioritás: MAGAS.**

- **Maradj Fal.ai-n**, ha van depth+edge ControlNet és creative-upscaler — leggyorsabb út, a provider-absztrakció kész.
- **Ha a Fal nem ad elég kontrollt:** fontold meg a **Replicate**-et (sok archviz ControlNet/Flux-variáns) vagy egy **saját ComfyUI-backendet** GPU-n (RunPod/Modal) — ez adja a legtöbb kontrollt a többlépéses gráf felett, cserébe üzemeltetés. Döntés az eval-eredmények alapján (§4.4).
- **Fontos hibajavítás (korábbi élő teszt):** a `.env`-ben `RENDER2REAL_API_URL="http://localhost:3000"` magára a Next-appra mutat — a legacy texture/Fal Python-szerviz útvonal így biztosan hibás. Ezt tisztázni kell (külön szerviz URL vagy a direkt-Fal útra migrálás).

### 4.6 Aszinkron feldolgozás (job-queue)
**Felelős: BE + DevOps. Méret: M. Prioritás: MAGAS.**

A többlépéses pipeline lassabb és hosszabb — a jelenlegi szinkron `POST /api/generations` (és a kliensoldali batch-loop) nem elég. Vezess be **job-queue-t** (pl. BullMQ + Redis, vagy egy egyszerű DB-alapú sor a meglévő `GenerationLog` táblára építve) **valós progressz-eseményekkel** (SSE/WebSocket), hogy a `GeneratingOverlay` (`workspace-view.tsx`) valós állapotot mutasson a jelenlegi heurisztikus becslés helyett. Ez egyben a rendair „skip the queue" / „x4 generations at once" funkciók alapja.

> **Mérföldkő-definíció (Done):** az aranyhalmazon a geometria-megőrzés ≥ a régi pipeline szintjén, a fotorealizmus-pontszám pedig **mérhetően magasabb**, vak A/B-ben az esetek ≥70%-ában az újat választják. E nélkül egy funkció se épüljön rá.

---

## 5. Funkció-roadmap (rendair → FormaReal), szerepkörökre bontva

Minden blokk: **rendair-funkció → FormaReal-be építés (fájlszinten) → felelős szerep → méret → prioritás.**

### 5.1 Chat-alapú szerkesztés („Rendair Chat") — a flagship UX
**Felelős: FE (vezető) + BE + AI/ML + UX. Méret: L. Prioritás: MAGAS (a §4 után az első).**

- **Mit csinál a rendair:** vászon + alatta chat-input. A user ír („tedd estivé a fényt", „cseréld a homlokzatot téglára", „adj több növényt"), az AI iterál az aktuális képen, és a beszélgetés a verziótörténet.
- **FormaReal-be:**
  - Új `ChatPanel` komponens a `workspace-view.tsx` jobb paneljének helyére/mellé — input sáv (prompt + kép-csatolás + küldés), felette a beszélgetés-lista.
  - Adat: új `ChatMessage` Prisma-modell (proj_id, asset_id, szerep `user|assistant`, szöveg, eredmény `ImageVersion` ref). Minden asszisztens-üzenet egy generálás → egy új `ImageVersion` (a meglévő verzió-rendszerre ül rá, `versionType: edited`).
  - Backend: `POST /api/chat` — a NL-utasítást a prompt-engine (§4.3) „intent → pipeline-paraméterek" leképezéssel fordítja le (pl. „esti fény" → fény-prompt + idő-paraméter; „tégla homlokzat" → maszkolt edit, lásd §5.3). Kezdetben **szabály-/sablonalapú** értelmezés (LLM nélkül is működik); később egy kis LLM-réteg a finomabb intentekhez.
  - A meglévő sliderek/presetek **nem tűnnek el**, hanem „haladó" fülre kerülnek — a chat a fő, az űrlap a kiegészítő.
- **Miért ez a legnagyobb UX-ugrás:** a merev „preset + 10 slider" modellt (amit a korábbi audit is kognitív tehernek jelölt) lecseréli egy természetes, iteratív folyamatra.

### 5.2 Több bemeneti modalitás (Sketch / Floorplan / 3D / Text / Elevation / Section / CAD → Render)
**Felelős: AI/ML + BE + FE. Méret: L (de modalitásonként inkrementális). Prioritás: KÖZÉP-MAGAS.**

- **Mit csinál a rendair:** 10 különböző bemenetet fogad, mindegyikhez illesztett pipeline.
- **FormaReal-be:**
  - A bemenet-típus legyen **explicit választás** a projekt/feltöltés szintjén (`UploadDropzone` + új „input mód" választó). Tárold az `ImageAsset`-en egy `inputType` mezőt (`render | sketch | floorplan | model3d | elevation | section | text | photo`).
  - A pipeline (§4) **input-típus szerint** állítsa a kontroll-térképeket és a denoise-t: pl. **sketch→render** magasabb denoise + Canny (a vázlat csak kompozíciós váz); **floorplan→render** speciális (alaprajz→3D nézet, ez a legnehezebb, későbbre); **photo→render** depth-domináns.
  - **Text-To-Render** (prompt → kép, kontroll nélkül) a legegyszerűbb új modalitás — gyors győzelem, és a rendairnál is „unlimited".
  - **Javasolt sorrend:** Text → Sketch → Photo/Image (van) → 3D-model nézet → Elevation/Section → Floorplan (utolsó, legnehezebb).

### 5.3 Edit & Adjust — modern, NL-vezérelt, maszkolt szerkesztés
**Felelős: AI/ML + BE + FE. Méret: M. Prioritás: MAGAS.**

- **Mit csinál a rendair:** „változtasd meg a képrészt" — anyag, bútor, felület cseréje, a többi marad.
- **FormaReal-be:**
  - A meglévő `inpainting-canvas.tsx` / `texture-canvas.tsx` jó alap, de a **legacy Python szerviz** (`RENDER2REAL_API_URL`, ami most hibásan a Next-appra mutat) helyett **közvetlen Fal/Replicate inpaint** a §4 pipeline-on belül.
  - Két belépés: (a) **kattintásos maszk** (van) + NL-prompt; (b) **csak NL** a chatből (§5.1), automatikus szegmentációval (SAM-szerű) a „cseréld az ablakokat" típusú utasításhoz.
  - Eredmény: új `ImageVersion` (`versionType: edited`), így a verziótörténet/compare/megosztás változatlanul működik.

### 5.4 Variations — „endless variations with one click"
**Felelős: AI/ML + FE. Méret: S-M. Prioritás: KÖZÉP (nagy észlelt érték, kis befektetés).**

- **Mit csinál a rendair:** egy kattintás → több hangulat/fény/atmoszféra variáns.
- **FormaReal-be:** a §4.2 „több jelölt" képességére ráül: „Variációk" gomb → 3-4 generálás eltérő seeddel és/vagy fény-/hangulat-prompt-csavarokkal; grid-választó UI (a `workspace-view` előnézeti panelje alá). A kiválasztott variáns lesz az aktív verzió.

### 5.5 Artistic styles (realizmuson túl)
**Felelős: AI/ML + UX. Méret: S. Prioritás: ALACSONY-KÖZÉP.**

- **Mit csinál a rendair:** akvarell, vázlat, stb. stílusok.
- **FormaReal-be:** a preset-rendszer (`prisma` Preset, `category`) kibővítése `style` kategóriával + prompt-sablonok. Tisztán prompt-szintű, kis munka. (Megjegyzés: a „No redesign, only realism" alapszabályt ez lazítja — kezeld külön „kreatív" módként.)

### 5.6 Upscale & Enhance — dedikált finishing
**Felelős: AI/ML + FE. Méret: S. Prioritás: KÖZÉP (gyors győzelem, már félig megvan).**

- **FormaReal-be:** a meglévő `enableUpscaling` (fal creative-upscaler) emeld ki önálló **„Élesítés / Prezentációs minőség"** művertté: önálló gomb bármely verzión, tile-upscale a nagy felbontásért, és az export (`/api/export`) ajánlja fel a felskálázott változatot. Kredit-fogyasztó művelet lesz (§5.9).

### 5.7 Video & Animate (későbbi fázis)
**Felelős: AI/ML + BE. Méret: L. Prioritás: ALACSONY (csak a mag után).**

- **FormaReal-be:** kép→videó modell (pl. Fal/Replicate „image-to-video", parallax/orbit kamera). Új `versionType: video` vagy külön `VideoAsset`. Nehéz és drága (GPU-idő); a rendairnál is a legdrágább kreditmuvelet. **Csak akkor, ha a képminőség és a chat már szilárd.**

### 5.8 Vertikumok és use-case presetek (interior / landscape / staging)
**Felelős: Product + AI/ML. Méret: M. Prioritás: KÖZÉP.**

- **FormaReal-be:** a `Preset.category` bővítése (`exterior | interior | landscape | staging | product`), és use-case sablonok (konyha, fürdő, nappali, hotel-lobby…). Ez tisztán tartalom/prompt-munka a meglévő preset-infrán — kis kód, nagy piaci szélesítés. A landingen is megjelenítendő (lásd a korábbi audit USP-szekcióját).

### 5.9 Kredit / előfizetés (későbbi fázis)
**Felelős: BE + Product. Méret: M-L. Prioritás: ALACSONY (monetizáció a termék-érettség után).**

- **FormaReal-be:** `User`-hez `creditBalance`; minden generálás/upscale/edit/video kreditet ír le (a `GenerationLog`-ra építve). Stripe-integráció (Student/Creator/Pro/Team csomagok a rendair-mintára). „Skip the queue" és „x4 párhuzamos generálás" a §4.6 queue-ra ül. Privát mód = az asset-ek nem kerülnek megosztható/tréning-poolba.

### 5.10 Bizalom / referenciák / növekedés
**Felelős: Product/Growth + FE. Méret: S-M. Prioritás: MAGAS (olcsó, nagy konverziós hatás).**

- A rendair ereje a **social proof** (500k user, top-iroda logók, vélemények). A FormaReal landingjén ez nulla (lásd a korábbi audit §3.10, §4.1). Építsd be: valódi/pilot referenciák, before/after galéria (**Prompt Gallery** mintára), esettanulmányok. Ez a meglévő `landing-view.tsx`-be megy.

### 5.11 3D-plugin integrációk (jövőkép)
**Felelős: BE + külön plugin-dev. Méret: XL. Prioritás: NAGYON ALACSONY (hosszú táv).**

- Rhino/SketchUp/Revit/Blender pluginek, amelyek a nézetet egyenesen a FormaReal API-ba küldik. Csak akkor, ha van publikus, stabil generálási API és kereslet. Most a `Solutions` aloldalak SEO-tartalomként (a korábbi audit szerint hiányoznak) már hozhatnak forgalmat.

### 5.12 Privát mód, kereskedelmi licenc, többnyelvűség
**Felelős: BE + Legal + FE. Méret: S-M. Prioritás: KÖZÉP.**

- i18n váz megvan (`src/i18n`) — bővítsd (a rendair EN/ES/FR/IT/PT-t ad; nálad HU/EN van). Privát mód flag az `ImageAsset`/`Project` szinten. Kereskedelmi licenc = jogi szöveg + a csomaghoz kötve (a korábbi audit jelezte a hiányzó jogi oldalakat is).

---

## 6. UI/UX átalakítás — a „chat-vászon" paradigma

**Felelős: UX/UI (vezető) + FE. Méret: L. Prioritás: MAGAS.**

A rendair UX-magja: **a vászon a főszereplő, alatta egy chat-input sáv**, a beszélgetés a munkamenet. A FormaReal jelenlegi háromhasábos, sűrű kontroll-paneles workspace-e (a korábbi audit §5.3 szerint kognitív teher) ezt nem támogatja. Javasolt új elrendezés:

- **Közép (domináns):** nagy vászon, before/after `ComparisonView` (megvan, jó), verzió-szalag.
- **Alul:** **chat-input sáv** (prompt + kép/maszk csatolás + küldés) — ez váltja le a fő interakciót. „+ A … ↑" mintára.
- **Jobb (összecsukható, „Haladó"):** a meglévő presetek/sliderek/minőség/upscaling ide kerülnek, alapból csukva — aki akarja, kinyitja.
- **Bal:** projekt-assetek (megvan).
- **Dizájn-nyelv:** a FormaReal sötét téma + kék/lila akcent közel áll a rendair navy+narancs világához; tartsd meg a sajátod, de **emeld ki egyetlen erős CTA-akcentet** (a rendair narancsa nagyon jól konvertál). A before/after csúszka, mint vizuális védjegy, maradjon mindenhol.
- **Onboarding:** a meglévő `onboarding-tour.tsx` íródjon át a chat-flow köré („Írd le, mit szeretnél — pl. »tedd fotórealisztikussá esti fénnyel«").

> Konkrét fájlok: `src/components/workspace/workspace-view.tsx` (átstrukturálás), új `src/components/workspace/chat-panel.tsx`, `src/components/ui/*` (input sáv), `onboarding-tour.tsx`.

---

## 7. Csapat-delegálási mátrix (ki mit csinál)

| Szerep | Fő felelősség ebben a projektben | Kulcs-fejezetek |
|---|---|---|
| **AI/ML Engineer** | Pipeline-újratervezés (depth+edge ControlNet, refine, upscale, fidelity-gate), prompt-engine, eval-harness, modell-/szolgáltató-döntés, modalitás-specifikus pipeline-ok | §4 (mind), §5.2, §5.3, §5.4, §5.5, §5.6 |
| **Backend Engineer** | Provider-adapter(ek), `/api/generations` és új `/api/chat`, job-queue + progressz-események, Prisma-séma (ChatMessage, inputType, credit), texture/inpaint direkt-integráció | §4.2, §4.6, §5.1, §5.3, §5.9 |
| **Frontend Engineer** | Chat-panel + vászon-átstrukturálás, variációk-grid, upscale-UX, modalitás-választó, verzió/compare megtartása | §5.1, §5.2, §5.4, §5.6, §6 |
| **UX/UI Designer** | Chat-vászon paradigma, onboarding, dizájn-nyelv/CTA, before/after védjegy, haladó-panel információs architektúra | §6, §5.1 |
| **DevOps** | GPU-backend döntés (Fal/Replicate/ComfyUI), Redis/queue infra, env-tisztítás (`RENDER2REAL_API_URL`), megfigyelhetőség | §4.5, §4.6 |
| **Product/Growth** | Vertikum-/use-case-stratégia, referencia/galéria/social proof, csomag-/kredit-modell, SEO use-case oldalak | §5.8, §5.10, §5.9, §5.11 |
| **QA** | Eval-harness működtetése, vak A/B, regresszió a geometria-megőrzésre, end-to-end tesztek (a meglévő Vitest-re építve) | §4.4, minden „Done"-kapu |

> 1-3 fős csapatnál: 1 ember viszi az **AI/ML + BE** kalapot (a mag), 1 a **FE + UX**-ot, a **Product/Growth/QA** megosztva. A sorrend akkor is a §8 fázisozás szerinti.

---

## 8. Fázisozott ütemterv

### Fázis 0 — Alapozás és mérhetőség (≈1 hét) — *e nélkül ne kezdj hangolni*
- Eval-harness + aranyhalmaz (§4.4). DevOps: `RENDER2REAL_API_URL` és provider-env tisztázása (§4.5). Job-queue váz (§4.6).
- **Done:** számszerű, ismételhető minőségmérés a jelenlegi pipeline-ra (baseline).

### Fázis 1 — A minőség megoldása (≈2-4 hét) — KRITIKUS, minden más ezen áll
- Új többlépéses pipeline (depth+edge → refine → upscale → fidelity-gate, §4.2), prompt-engine + negatív promptok (§4.3), modell-döntés (§4.5).
- **Done:** vak A/B-ben az új kimenetet választják ≥70%-ban, a geometria-megőrzés nem romlik.

### Fázis 2 — Chat-szerkesztés + UX (≈3-5 hét) — a nagy élmény-ugrás
- Chat-panel + vászon-átstrukturálás (§5.1, §6), NL→pipeline intent (szabályalapú induláshoz), Edit & Adjust direkt-integráció (§5.3).
- **Done:** a felhasználó természetes nyelven iterál egy képen, a verziótörténet a beszélgetés.

### Fázis 3 — Bemeneti szélesség + finishing (≈3-4 hét) — piacnyitás
- Text→Render és Sketch→Render (§5.2), Variations (§5.4), dedikált Upscale (§5.6), interior/landscape/staging presetek (§5.8).
- **Done:** legalább 3 új bemeneti modalitás + variációk élesben.

### Fázis 4 — Növekedés és monetizáció (folyamatos)
- Social proof/galéria (§5.10), kredit/Stripe (§5.9), művészi stílusok (§5.5), többnyelvűség/privát mód (§5.12), SEO use-case oldalak.

### Fázis 5 — Hosszú táv
- Video & Animate (§5.7), 3D-plugin integrációk (§5.11), csapatmunka.

---

## 9. Kockázatok, mérés, KPI-k

- **Legnagyobb kockázat:** a minőség nem javul mérhetően. **Ellenszer:** Fázis 0 eval-harness — sose hangolj „érzésre", csak az aranyhalmaz számai alapján (§4.4). Ez közvetlenül a Te „bárhogy javítok, nem jobb" problémádat oldja.
- **Költség-kockázat:** a többlépéses pipeline + upscale + (később) videó GPU-időt éget. **Ellenszer:** kredit-modell (§5.9), minőségi-fokozat választó (a meglévő low/medium/high), és cache-elés azonos input+paraméterre.
- **Scope-kockázat:** a rendair széles; a csábítás, hogy mindent egyszerre. **Ellenszer:** a §8 sorrend szigorú betartása — előbb minőség, utána UX, utána szélesség.
- **Termék-KPI-k:** generálásonkénti „elfogadás" arány (a user megtartja-e a kimenetet), iterációk száma a kívánt képig (chat előtt/után), aktiválás (regisztráció → első megtartott render), retenció.
- **Minőség-KPI-k:** geometria-megőrzés (edge-IoU/SSIM), fotorealizmus-pontszám, vak A/B nyerési arány az előző pipeline ellen.

---

## 10. Az első 5 konkrét lépés (amivel holnap indulhatsz)

1. **Állítsd össze az aranyhalmazt** (15-25 valós forrás-render, vegyes típus) és írd meg a `scripts/eval-pipeline.js` baseline-mérőt (§4.4). *(AI/ML + QA)*
2. **Tisztázd a generálási backendet:** javítsd a `.env` `RENDER2REAL_API_URL` problémát, és döntsd el Fal vs Replicate vs saját ComfyUI az első kísérletekhez (§4.5). *(DevOps + AI/ML)*
3. **Építsd meg a depth+edge kétkontrollos, refine-os pipeline prototípusát** egy új provider-adapterben, a régi mellett (§4.2). *(AI/ML + BE)*
4. **Vezesd be a negatív promptot és a fotografikus prompt-sablonokat** a `prompt-engine`-ben, és kösd a presetekhez (§4.3). *(AI/ML)*
5. **Méricskélj és dönts:** futtasd az aranyhalmazt régi vs új pipeline-nal, és csak akkor lépj a chat-UX-re (Fázis 2), ha az A/B nyerési arány megvan (§8 Fázis 1 „Done"). *(QA)*

> A teljes korábbi UI/SEO/UX/biztonsági auditot lásd: `FORMAREAL_FEJLESZTESI_DOKUMENTACIO.md` — a két dokumentum együtt ad teljes képet (az egyik a meglévő termék hibái, a másik a rendair-szintű továbbfejlesztés).
