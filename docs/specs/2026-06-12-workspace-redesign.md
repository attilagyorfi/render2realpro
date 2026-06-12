# FormaVeris — Workspace-újratervezés (drótváz + UX-logika + technikai terv)

**Dátum:** 2026-06-12 · **Szerep:** Senior UI/UX + frontend terv
**Cél:** a képjavító munkafelület laikus kkv-felhasználó számára is intuitív legyen; a jobb panel a *Cél → Beállítások → Akció → Eredmény* ívet kövesse; a középső panel egyetlen nagy Before/After munkaterület legyen.

---

## 1. Új UI-hierarchia (drótváz, pszeudokód)

```text
WorkspaceView
├── AppFrame (fejléc: logó→/app · nav · profil[név] · kijelentkezés)
│
├── MobilePanelSwitcher (xl alatt: Fájlok | Vászon | Vezérlők)   ← megvan (U1)
│
└── Grid [240px | 1fr | 360px]   (xl felett)
    │
    ├── LEFT  — AssetRail (változatlan: feltöltés + fájllista + drag-reorder)
    │
    ├── CENTER — Munkaasztal (ÚJ szerkezet)
    │   ├── TopBar (jobbra zárt, kompakt)
    │   │   ├── ExportControls  [formátum ▾][méret ▾][Letöltés]   ← ide költözik
    │   │   └── FullscreenToggle
    │   ├── Canvas (egyetlen nagy munkaterület)
    │   │   ├── ha VAN generált verzió → <ComparisonView before after />  (inline slider!)
    │   │   ├── ha NINCS             → <ZoomableImagePanel original />
    │   │   └── FloatingToolbar (bal-alsó, lebegő, 2-3 ikon)
    │   │       ├── 🖌 Anyagszerkesztő (maszk + prompt → meglévő InpaintingCanvas)
    │   │       └── ⤢ Zoom/Pan reset
    │   └── ∅  A "SOR ÁLLAPOTA" sáv TÖRÖLVE — progress a CTA-gombban + toast
    │
    └── RIGHT — Vezérlőpanel (ÚJ sorrend: Cél → Beállítás → Akció → Eredmény)
        ├── ① INPUT (mindig nyitva)
        │   ├── Preset ▾  (legelső elem — ez a "mit szeretnék" döntés)
        │   ├── [toggle] Saját prompt
        │   │   └── ha BE → <Textarea prompt> (kötelező, feltételes render)
        │   ├── Generálás minősége  [Gyors|Közepes|Magas]
        │   └── [toggle] 2× Upscaling
        ├── ② HALADÓ BEÁLLÍTÁSOK (Accordion, alapból zárva)
        │   ├── Negatív prompt <Textarea>
        │   │   placeholder: "amit NE tartalmazzon…"
        │   │   (háttérben MINDIG aktív default: watermark/szöveg/logó tiltás)
        │   └── Kreativitás (denoising strength) ──────●──  0.2 … 0.85
        │       felirat: "Alacsony = hű marad · Magas = bátrabb átalakítás"
        ├── ③ AKCIÓ
        │   └── [████ Automatikus javítás ████]  (elsődleges CTA)
        │       generálás közben: gomb = progress-sáv + % + [Mégse]
        ├── ④ EREDMÉNY
        │   └── "Előzmények / Verziók" — ÖSSZEVONT lista
        │       (verzió-előzmény + generálási napló EGY idővonalon;
        │        elem: bélyegkép · típus-badge · idő · [Visszaállítás])
        └── ⑤ KÉP ADATOK (Accordion, alapból ZÁRVA, legalul)
```

---

## 2. UX-indoklás (miért oda került, ahova)

| Elem | Hova | Miért |
|---|---|---|
| **Preset legfelülre** | ① teteje | Ez a "mit akarok elérni" döntés — a journey első kérdése. A laikus user először célt választ, nem paramétert. |
| **Saját prompt feltételes textarea** | preset alatt | A toggle önmagában nem kommunikálja, MIT kapcsol — a feltételesen megjelenő, kötelező mező viszont kényszerítő erejű affordance: ha bekapcsoltad, írnod kell. |
| **Minőség + Upscaling az inputban** | ① alja | Ezek a generálás "mennyit várjak / mennyibe kerül" paraméterei — a döntés részei, nem haladó tuning. |
| **Negatív prompt + Kreativitás accordionba** | ② zárva | A 80%-os use-case-nek nem kell; aki érti, megtalálja. A zárt accordion csökkenti az első benyomás kognitív terhét (a 06-12-es audit 5.3-as megállapítása: 8 szekciós végtelen oszlop). |
| **Default negatív prompt a háttérben** | szerveroldal | A vízjel/felirat/logó tiltása nem felhasználói döntés, hanem minőségbiztosítás — a usernek nem kell tudnia róla, hogy működjön. |
| **CTA közvetlenül a beállítások alatt** | ③ | A szem útja felülről lefelé: cél → beállítás → "indítsd". A gomb fölött MINDEN releváns input, alatta MINDEN output — nincs fel-le ugrálás. |
| **Összevont Előzmények/Verziók** | ④ CTA alatt | A két külön blokk (verziók + generálási napló) ugyanazt az időbeli történetet mesélte két helyen. Az akció eredménye közvetlenül az akció alatt jelenik meg — azonnal látszik az ok-okozat. |
| **Kép adatok legalul, zárva** | ⑤ | Tisztán referencia-adat (felbontás, fájlnév) — sosem akció tárgya. |
| **Export a középső panel tetejére** | CENTER TopBar | Az export a KÉP művelete, nem a generálásé — oda tartozik, ahol a kép van. A lebegő sáv eltűnik. |
| **Inline Before/After slider** | CENTER | A vertikális kettéosztás (eredeti felül, előnézet alul) fél-fél méretű képeket adott, és a szem ugrált. Egyetlen nagy, húzható csúszka = teljes méretű összehasonlítás, és ez az iparági konvenció (minden képjavító így csinálja). A kényszerített fullscreen-compare megszűnik (fullscreen opció marad). |
| **"Sor állapota" sáv törlése** | — | Egyetlen párhuzamos művelet van; a sáv duplikálta a gomb-progress információt és ~70px-et vett el a vászonból. Batch-state a toastban él tovább. |

---

## 3. Technikai implementáció

### 3.1 Feltételes prompt-doboz (① Saját prompt)

```tsx
const [customPromptEnabled, setCustomPromptEnabled] = useState(false);
// ...
<Switch checked={customPromptEnabled} onCheckedChange={setCustomPromptEnabled} />
{customPromptEnabled && (
  <Textarea
    value={customPromptText}
    onChange={...}
    required
    aria-invalid={customPromptText.trim().length < 4}
  />
)}
// A CTA disabled feltétele bővül:
disabled={isGenerating || (customPromptEnabled && customPromptText.trim().length < 4)}
```
Animált megjelenés: a meglévő `framer-motion` `AnimatePresence` + `height: auto` tween — már használt minta a kódbázisban.

### 3.2 Before/After slider — MEGLÉVŐ komponens újrahasznosítása

A `src/components/comparison/comparison-view.tsx` már akadálymentes
(`role="slider"`, `aria-valuenow`, nyíl-billentyű, touch). A középső panel
egyszerűen ezt rendereli teljes méretben, a "van-e generált verzió" feltétellel:

```tsx
{hasGeneratedVersion ? (
  <ComparisonView
    beforeUrl={originalVersion.fileUrl}
    afterUrl={selectedVersion.fileUrl}
    beforeLabel={t("workspace.originalReference", language)}
    afterLabel={t("workspace.latestOutput", language)}
  />
) : (
  <ZoomableImagePanel src={originalUrl} ... />
)}
```
A landing duplikált CompareSlider-e külön tételként szintén erre cserélendő (audit P2.7).

### 3.3 Kreativitás-csúszka → Fal `strength`

A csatorna már létezik: `settingsOverride` → `mergePresetSettings` → `input.prompt.settings`.
```tsx
// kliens (② accordion):
settingsOverride: { quality, enableUpscaling, creativity }   // 0.2–0.85, default 0.4
// szerver (fal-provider.ts):
const s = input.prompt.settings as Record<string, unknown>;
const strength = clamp(Number(s.creativity ?? DEFAULT_STRENGTH), 0.2, 0.85);
const steps = s.quality === "low" ? 24 : s.quality === "high" ? 40 : 30;
```
**Kalibráció (smoke-teszttel mérve):** 0.3 = finom textúra-frissítés · 0.4 = kiegyensúlyozott (default) · 0.6–0.75 = stilizált/izometrikus inputnál is látványos átalakulás. A 06-12-i „alig változik" panasz oka a fix 0.4 volt — a csúszka pont ezt teszi felhasználói döntéssé.

### 3.4 Default negatív prompt (háttér, mindig aktív)

```ts
const BASE_NEGATIVE = "watermark, stock photo watermark, sample text, letters, typography, logo, signature, ...";
const negative_prompt = userNegative ? `${userNegative}, ${BASE_NEGATIVE}` : BASE_NEGATIVE;
```
Közvetlen kiváltó ok: a teszt-képeken stock-vízjel volt, és a modell hajlamos "lerajzolni" a vízjelszerű textúrát.

### 3.5 Progress a CTA-gombban + toast

```tsx
<Button disabled={isGenerating} className="relative overflow-hidden w-full">
  {isGenerating && (
    <motion.span className="absolute inset-y-0 left-0 bg-white/15"
      animate={{ width: `${displayProgress}%` }} />
  )}
  <span className="relative">
    {isGenerating ? `${displayProgress}% — Generálás…` : "Automatikus javítás"}
  </span>
</Button>
{isGenerating && <Button variant="ghost" size="sm" onClick={cancel}>Mégse</Button>}
```
A becslés-logika (log-görbe, 15/25/40 s) és az AbortController már létezik (U1.5) — csak a megjelenítés helye változik: overlay → gomb. Befejezéskor `toast.success`, a queue-sáv komponens törlődik.

### 3.6 Komponens-bontás (refaktor-terv)

A `workspace-view.tsx` ma ~1900 sor. A redesign egyben bontás is:
```
workspace/
├── workspace-view.tsx          (orchestrátor, ~300 sor)
├── panels/asset-rail.tsx
├── panels/canvas-panel.tsx     (ComparisonView + FloatingToolbar + ExportControls)
├── panels/controls-panel.tsx   (①–⑤ szekciók)
├── controls/generate-button.tsx
├── controls/advanced-accordion.tsx
└── controls/history-timeline.tsx  (összevont verziók+napló)
```
Accordion: ha nincs kész primitív, 20 soros saját `<details>`-alapú vagy state-elt collapsible — nem érdemes új függőséget behozni miatta.

---

## 4. Ütemezés

| Fázis | Tartalom | Becslés |
|---|---|---|
| R1 | Backend-plumbing: creativity→strength, default negatív prompt, quality→steps | 1 óra ✅ (e doksival együtt készül) |
| R2 | Jobb panel átrendezés (①–⑤) + accordion + CTA-progress + queue-sáv törlés | 0,5–1 nap |
| R3 | Középső panel: inline ComparisonView + export-költöztetés + lebegő eszköztár | 0,5 nap |
| R4 | Komponens-bontás (3.6) + tesztek | 0,5 nap |
```
