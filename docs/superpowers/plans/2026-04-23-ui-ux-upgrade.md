# Render2Real Pro UI/UX Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refine the existing Render2Real Pro product into a more cohesive premium B2B SaaS experience while preserving the current product strategy, routing model, and architecture-safe workflow.

**Architecture:** This plan keeps the current `/` and `/app` split, preserves the existing project and workspace model, and upgrades the app through focused passes: design-token normalization, shell refinement, workspace cleanup, and public marketing improvements. The work is structured to avoid a product reset and to keep future modules such as gallery, analytics, API docs, and texture targeting compatible with the current architecture.

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind CSS, shadcn/ui, Zustand, React Query, Framer Motion, Vitest, ESLint

---

## File Structure Map

### Existing files to modify

- `C:\Users\User\Desktop\render2realpro\src\app\globals.css`
  - Global design tokens, theme variables, shared surface styles, motion timings.
- `C:\Users\User\Desktop\render2realpro\src\app\providers.tsx`
  - Theme transition behavior.
- `C:\Users\User\Desktop\render2realpro\src\components\layout\app-frame.tsx`
  - App shell structure, auth-state presentation, nav hierarchy.
- `C:\Users\User\Desktop\render2realpro\src\components\dashboard\dashboard-view.tsx`
  - Dashboard card hierarchy and summary surface.
- `C:\Users\User\Desktop\render2realpro\src\components\projects\projects-view.tsx`
  - Project library treatment.
- `C:\Users\User\Desktop\render2realpro\src\components\workspace\workspace-view.tsx`
  - Workspace visual hierarchy, compare emphasis, collapsible controls, generation/export presentation.
- `C:\Users\User\Desktop\render2realpro\src\components\landing\landing-view.tsx`
  - Landing information architecture and visual rhythm.
- `C:\Users\User\Desktop\render2realpro\src\components\preview\preview-view.tsx`
  - Feature preview alignment with refined product messaging.
- `C:\Users\User\Desktop\render2realpro\src\i18n\index.ts`
  - Any new labels introduced by the refinement.

### New files to create

- `C:\Users\User\Desktop\render2realpro\src\components\ui\status-dot.tsx`
  - Reusable queue and state indicator.
- `C:\Users\User\Desktop\render2realpro\src\components\ui\progress-meter.tsx`
  - Reusable progress bar with normalized visuals.
- `C:\Users\User\Desktop\render2realpro\src\components\ui\surface-card.tsx`
  - Optional wrapper for consistent premium panel styling if existing card primitives are too inconsistent.
- `C:\Users\User\Desktop\render2realpro\src\config\design-tokens.ts`
  - Shared semantic status definitions and token-backed UI helpers if needed.
- `C:\Users\User\Desktop\render2realpro\tests\ui-upgrade-primitives.test.ts`
  - Tests for semantic status helpers and shared UI logic.
- `C:\Users\User\Desktop\render2realpro\tests\auth-routing.test.ts`
  - Extend existing route/auth tests if shell behavior changes.

### Existing files to inspect during implementation

- `C:\Users\User\Desktop\render2realpro\src\components\ui\button.tsx`
- `C:\Users\User\Desktop\render2realpro\src\components\ui\card.tsx`
- `C:\Users\User\Desktop\render2realpro\src\store\app-preferences.ts`
- `C:\Users\User\Desktop\render2realpro\src\lib\fetch-json.ts`
- `C:\Users\User\Desktop\render2realpro\tests\app-preferences.test.ts`

---

### Task 1: Normalize The Visual System

**Files:**
- Create: `C:\Users\User\Desktop\render2realpro\src\config\design-tokens.ts`
- Create: `C:\Users\User\Desktop\render2realpro\src\components\ui\status-dot.tsx`
- Create: `C:\Users\User\Desktop\render2realpro\src\components\ui\progress-meter.tsx`
- Modify: `C:\Users\User\Desktop\render2realpro\src\app\globals.css`
- Test: `C:\Users\User\Desktop\render2realpro\tests\ui-upgrade-primitives.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";

import {
  getGenerationStatusTone,
  getGenerationStatusLabelKey,
} from "@/config/design-tokens";

describe("design token helpers", () => {
  it("maps processing statuses to semantic tones", () => {
    expect(getGenerationStatusTone("queued")).toBe("warning");
    expect(getGenerationStatusTone("processing")).toBe("info");
    expect(getGenerationStatusTone("completed")).toBe("success");
    expect(getGenerationStatusTone("failed")).toBe("danger");
  });

  it("returns stable translation keys for generation statuses", () => {
    expect(getGenerationStatusLabelKey("queued")).toBe("status.queued");
    expect(getGenerationStatusLabelKey("processing")).toBe("status.processing");
    expect(getGenerationStatusLabelKey("completed")).toBe("status.completed");
    expect(getGenerationStatusLabelKey("failed")).toBe("status.failed");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/ui-upgrade-primitives.test.ts`  
Expected: FAIL with missing module or missing helper exports.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/config/design-tokens.ts
export type SemanticTone = "neutral" | "info" | "success" | "warning" | "danger";
export type GenerationStatus = "queued" | "processing" | "completed" | "failed";

export function getGenerationStatusTone(status: GenerationStatus): SemanticTone {
  switch (status) {
    case "queued":
      return "warning";
    case "processing":
      return "info";
    case "completed":
      return "success";
    case "failed":
      return "danger";
  }
}

export function getGenerationStatusLabelKey(status: GenerationStatus) {
  return `status.${status}` as const;
}
```

```tsx
// src/components/ui/status-dot.tsx
import { cn } from "@/lib/utils";
import type { SemanticTone } from "@/config/design-tokens";

const toneClasses: Record<SemanticTone, string> = {
  neutral: "bg-zinc-500/70",
  info: "bg-sky-400 shadow-[0_0_16px_rgba(56,189,248,0.4)]",
  success: "bg-emerald-400 shadow-[0_0_16px_rgba(52,211,153,0.35)]",
  warning: "bg-amber-400 shadow-[0_0_16px_rgba(251,191,36,0.35)]",
  danger: "bg-rose-400 shadow-[0_0_16px_rgba(244,63,94,0.35)]",
};

export function StatusDot({ tone, className }: { tone: SemanticTone; className?: string }) {
  return <span className={cn("inline-flex size-2.5 rounded-full", toneClasses[tone], className)} />;
}
```

```tsx
// src/components/ui/progress-meter.tsx
import { cn } from "@/lib/utils";

export function ProgressMeter({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const safeValue = Math.max(0, Math.min(100, value));

  return (
    <div className={cn("h-1.5 overflow-hidden rounded-full bg-[var(--border-subtle)]", className)}>
      <div
        className="h-full rounded-full bg-[linear-gradient(90deg,var(--accent-primary),var(--accent-cyan))] transition-[width] duration-500 ease-out"
        style={{ width: `${safeValue}%` }}
      />
    </div>
  );
}
```

```css
/* src/app/globals.css */
:root {
  --bg-base: #f4f6fa;
  --bg-surface: #eef2f7;
  --bg-elevated: #ffffff;
  --bg-card: #ffffff;
  --border-subtle: #d8e0eb;
  --border-default: #c0cddd;
  --border-accent: #6ca7d8;
  --text-primary: #111827;
  --text-secondary: #4b5563;
  --text-muted: #728097;
  --accent-primary: #1583e9;
  --accent-cyan: #4fd5ff;
  --accent-green: #17c98d;
  --accent-amber: #efaa35;
  --accent-red: #ef476f;
}

.dark {
  --bg-base: #0a0c10;
  --bg-surface: #0f1117;
  --bg-elevated: #161b24;
  --bg-card: #1a2030;
  --border-subtle: #1e2a3a;
  --border-default: #253347;
  --border-accent: #2a4a6b;
  --text-primary: #e8edf5;
  --text-secondary: #8a9bb5;
  --text-muted: #4a5a72;
  --accent-primary: #0d8cf0;
  --accent-cyan: #00d4ff;
  --accent-green: #00e5a0;
  --accent-amber: #f0a020;
  --accent-red: #f04060;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/ui-upgrade-primitives.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/config/design-tokens.ts src/components/ui/status-dot.tsx src/components/ui/progress-meter.tsx src/app/globals.css tests/ui-upgrade-primitives.test.ts
git commit -m "feat: normalize ui design tokens and status primitives"
```

---

### Task 2: Refine The App Shell And Navigation Hierarchy

**Files:**
- Modify: `C:\Users\User\Desktop\render2realpro\src\components\layout\app-frame.tsx`
- Modify: `C:\Users\User\Desktop\render2realpro\src\app\providers.tsx`
- Modify: `C:\Users\User\Desktop\render2realpro\src\i18n\index.ts`
- Test: `C:\Users\User\Desktop\render2realpro\tests\auth-routing.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";

import { resolveAuthRedirect } from "@/services/auth/auth-routing";

describe("auth redirects for app shell", () => {
  it("keeps authenticated users out of auth forms", () => {
    expect(resolveAuthRedirect("/login", true)).toBe("/app");
    expect(resolveAuthRedirect("/register", true)).toBe("/app");
  });

  it("keeps unauthenticated users out of app routes", () => {
    expect(resolveAuthRedirect("/app", false)).toBe("/login");
    expect(resolveAuthRedirect("/app/settings", false)).toBe("/login");
  });
});
```

- [ ] **Step 2: Run test to verify it passes before UI changes**

Run: `npm test -- tests/auth-routing.test.ts`  
Expected: PASS  
Note: this step confirms the current redirect guard remains intact before shell refactor.

- [ ] **Step 3: Update the shell structure**

```tsx
// app-frame direction
// - separate primary navigation, utility controls, and signed-in identity area
// - use token-backed surfaces instead of ad-hoc white/black opacity values
// - add a compact authenticated state rail and clearer page chrome
// - localize remaining sign-in and loading copy through t(...)
// - preserve slow theme transitions already introduced in providers.tsx
```

Implementation requirements:

- translate remaining English-only shell copy
- replace mixed opacity surfaces with token-backed classes
- make nav active state visually stronger
- keep the current language select and theme toggle
- keep auth guard behavior stable

- [ ] **Step 4: Run verification**

Run:

```bash
npx tsc --noEmit
npm run lint
npm test -- tests/auth-routing.test.ts
```

Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/app-frame.tsx src/app/providers.tsx src/i18n/index.ts tests/auth-routing.test.ts
git commit -m "feat: refine app shell hierarchy and localized auth states"
```

---

### Task 3: Upgrade The Dashboard Into A Cleaner Operational Overview

**Files:**
- Modify: `C:\Users\User\Desktop\render2realpro\src\components\dashboard\dashboard-view.tsx`
- Create: `C:\Users\User\Desktop\render2realpro\src\components\dashboard\metric-card.tsx`
- Modify: `C:\Users\User\Desktop\render2realpro\src\i18n\index.ts`

- [ ] **Step 1: Write the failing component test**

```ts
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MetricCard } from "@/components/dashboard/metric-card";

describe("MetricCard", () => {
  it("renders a label and value", () => {
    render(<MetricCard label="Jobs Today" value="12" meta="+8%" />);
    expect(screen.getByText("Jobs Today")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("+8%")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/dashboard-metric-card.test.ts`  
Expected: FAIL with missing file or missing export.

- [ ] **Step 3: Implement the dashboard refinement**

```tsx
// Create a MetricCard primitive and use it in dashboard-view.tsx
// Dashboard should contain:
// - concise hero / value statement
// - new project action
// - 3 to 4 compact operational summary cards
// - recent activity / queue snapshot card
// - no full project list grid
```

Implementation requirements:

- preserve the current “new project” entry point
- reduce visual density
- use reusable metric cards instead of ad-hoc inline cards
- make the dashboard feel lighter than the projects page

- [ ] **Step 4: Run verification**

Run:

```bash
npm test -- tests/dashboard-metric-card.test.ts
npx tsc --noEmit
npm run lint
```

Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/dashboard-view.tsx src/components/dashboard/metric-card.tsx src/i18n/index.ts tests/dashboard-metric-card.test.ts
git commit -m "feat: redesign dashboard as a concise operational overview"
```

---

### Task 4: Turn Projects Into A Stronger Project Library

**Files:**
- Modify: `C:\Users\User\Desktop\render2realpro\src\components\projects\projects-view.tsx`
- Modify: `C:\Users\User\Desktop\render2realpro\src\components\projects\project-create-form.tsx`
- Modify: `C:\Users\User\Desktop\render2realpro\src\i18n\index.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";

import { formatProjectAssetCount } from "@/components/projects/projects-view";

describe("formatProjectAssetCount", () => {
  it("returns a stable label for the asset count", () => {
    expect(formatProjectAssetCount(1)).toBe("1 file");
    expect(formatProjectAssetCount(3)).toBe("3 files");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/projects-view.test.ts`  
Expected: FAIL because helper does not exist.

- [ ] **Step 3: Implement the project library treatment**

```tsx
// Projects page direction
// - stronger thumbnail / metadata hierarchy
// - clearer card distinction
// - slightly larger project surfaces
// - prepare header for future search and filter controls
// - keep project creation visible but secondary to the library list
```

Implementation requirements:

- keep dedicated project creation available on the page
- make open-project action visually obvious
- use more mature spacing and metadata grouping
- export a small formatting helper only if needed for testability

- [ ] **Step 4: Run verification**

Run:

```bash
npm test -- tests/projects-view.test.ts
npx tsc --noEmit
npm run lint
```

Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/projects/projects-view.tsx src/components/projects/project-create-form.tsx src/i18n/index.ts tests/projects-view.test.ts
git commit -m "feat: upgrade projects page into a richer project library"
```

---

### Task 5: Refine The Workspace For Image-First Use

**Files:**
- Modify: `C:\Users\User\Desktop\render2realpro\src\components\workspace\workspace-view.tsx`
- Modify: `C:\Users\User\Desktop\render2realpro\src\components\upload\upload-dropzone.tsx`
- Modify: `C:\Users\User\Desktop\render2realpro\src\i18n\index.ts`
- Reuse: `C:\Users\User\Desktop\render2realpro\src\components\ui\status-dot.tsx`
- Reuse: `C:\Users\User\Desktop\render2realpro\src\components\ui\progress-meter.tsx`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";

import { getWorkspaceRailDefaultState } from "@/components/workspace/workspace-view";

describe("workspace rail state", () => {
  it("defaults the controls rail to expanded", () => {
    expect(getWorkspaceRailDefaultState()).toBe("expanded");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/workspace-view.test.ts`  
Expected: FAIL because the helper does not exist.

- [ ] **Step 3: Implement the workspace refinement**

```tsx
// Workspace requirements
// - keep original vs latest result visually dominant
// - make upload entry compact
// - improve compare emphasis
// - keep right controls rail collapsible
// - use standardized status dot and progress meter
// - tighten generation state and export state presentation
// - do not reintroduce prompt preview into the main flow
```

Implementation requirements:

- preserve current generation functionality
- preserve fallback-to-mock behavior
- reduce visual clutter around controls
- keep future Texture Targeting compatibility by avoiding hard-coded “single-mode only” copy

- [ ] **Step 4: Run verification**

Run:

```bash
npm test -- tests/workspace-view.test.ts
npx tsc --noEmit
npm run lint
```

Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/workspace/workspace-view.tsx src/components/upload/upload-dropzone.tsx src/components/ui/status-dot.tsx src/components/ui/progress-meter.tsx src/i18n/index.ts tests/workspace-view.test.ts
git commit -m "feat: refine workspace around an image-first generation flow"
```

---

### Task 6: Upgrade The Landing Page With Stronger SaaS Blocks

**Files:**
- Modify: `C:\Users\User\Desktop\render2realpro\src\components\landing\landing-view.tsx`
- Modify: `C:\Users\User\Desktop\render2realpro\src\components\preview\preview-view.tsx`
- Modify: `C:\Users\User\Desktop\render2realpro\src\i18n\index.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";

import { getPricingHighlightTier } from "@/components/landing/landing-view";

describe("landing pricing highlight", () => {
  it("keeps the studio tier as the highlighted offer", () => {
    expect(getPricingHighlightTier()).toBe("studio");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/landing-view.test.ts`  
Expected: FAIL because the helper does not exist.

- [ ] **Step 3: Implement the landing refinement**

```tsx
// Landing direction
// - keep current editorial spacing
// - add stronger SaaS conversion blocks where missing:
//   stats strip
//   integrations strip
//   stronger feature grid hierarchy
// - preserve FAQ and preview flow
// - keep B2B architecture-safe messaging
// - avoid generic AI generator language
```

Implementation requirements:

- maintain bilingual support
- keep smooth anchor scrolling and back-to-top
- make pricing differentiation stronger without becoming gimmicky
- align preview page copy with the more mature product framing

- [ ] **Step 4: Run verification**

Run:

```bash
npm test -- tests/landing-view.test.ts
npx tsc --noEmit
npm run lint
```

Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/landing/landing-view.tsx src/components/preview/preview-view.tsx src/i18n/index.ts tests/landing-view.test.ts
git commit -m "feat: strengthen landing page with clearer saas conversion blocks"
```

---

### Task 7: Add Texture Targeting Readiness Without Full Implementation

**Files:**
- Modify: `C:\Users\User\Desktop\render2realpro\src\components\workspace\workspace-view.tsx`
- Modify: `C:\Users\User\Desktop\render2realpro\src\store\workspace-store.ts`
- Modify: `C:\Users\User\Desktop\render2realpro\src\i18n\index.ts`
- Test: `C:\Users\User\Desktop\render2realpro\tests\workspace-mode.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";

import { createWorkspaceState } from "@/store/workspace-store";

describe("workspace mode readiness", () => {
  it("defaults to realism-pass mode", () => {
    expect(createWorkspaceState().mode).toBe("realism-pass");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/workspace-mode.test.ts`  
Expected: FAIL because mode is not modeled yet.

- [ ] **Step 3: Implement minimal readiness**

```ts
// store/workspace-store.ts
export type WorkspaceMode = "realism-pass" | "texture-targeting";

export function createWorkspaceState() {
  return {
    mode: "realism-pass" as WorkspaceMode,
    // preserve existing state fields here
  };
}
```

```tsx
// workspace-view.tsx
// - do not build full texture targeting UI yet
// - introduce a lightweight mode label or segmented control placeholder
// - keep realism pass selected by default
// - ensure copy and layout allow a second mode in the future
```

- [ ] **Step 4: Run verification**

Run:

```bash
npm test -- tests/workspace-mode.test.ts
npx tsc --noEmit
npm run lint
```

Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/workspace/workspace-view.tsx src/store/workspace-store.ts src/i18n/index.ts tests/workspace-mode.test.ts
git commit -m "feat: prepare workspace state for texture targeting mode"
```

---

### Task 8: Final Verification Pass

**Files:**
- Verify only; no planned file creation

- [ ] **Step 1: Run targeted tests**

Run:

```bash
npm test -- tests/auth-routing.test.ts tests/auth-services.test.ts tests/ui-upgrade-primitives.test.ts tests/dashboard-metric-card.test.ts tests/projects-view.test.ts tests/workspace-view.test.ts tests/landing-view.test.ts tests/workspace-mode.test.ts
```

Expected: PASS

- [ ] **Step 2: Run static verification**

Run:

```bash
npx tsc --noEmit
npm run lint
npm run build
```

Expected: PASS

- [ ] **Step 3: Run manual smoke checklist**

Check these flows locally:

- landing loads in `HU` and `EN`
- dark/light transition still feels smooth
- login redirects into `/app`
- dashboard renders without project clutter
- projects page shows the library and create form
- workspace keeps image focus and rail collapse works
- generation fallback still offers retry/mock flow
- landing pricing and SaaS blocks render correctly

- [ ] **Step 4: Commit final polish if needed**

```bash
git add .
git commit -m "chore: finish ui ux upgrade verification"
```

---

## Self-Review

### Spec coverage

Covered:

- selective refinement rather than rebuild
- design token normalization
- app shell refinement
- dashboard cleanup
- project library improvement
- workspace image-first refinement
- landing SaaS-block upgrade
- future Texture Targeting readiness

Deferred by design:

- full gallery module
- analytics implementation
- API docs implementation
- billing and team modules

### Placeholder scan

No `TODO`, `TBD`, or implicit “handle this somehow” instructions are left intentionally.  
Each task includes files, commands, and explicit scope.

### Type consistency

Planned shared names are internally consistent:

- `GenerationStatus`
- `SemanticTone`
- `WorkspaceMode`
- `createWorkspaceState`

---

Plan complete and saved to `docs/superpowers/plans/2026-04-23-ui-ux-upgrade.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
