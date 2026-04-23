import { describe, expect, it } from "vitest";

import { DEFAULT_LANGUAGE, isSupportedLanguage, t } from "@/i18n";
import {
  DEFAULT_THEME,
  getNextTheme,
  normalizeThemePreference,
} from "@/store/app-preferences";
import {
  EXPORT_DESTINATIONS,
  getExportDestination,
  normalizeExportDestination,
} from "@/services/export/export-destinations";

describe("localization", () => {
  it("defaults to Hungarian and resolves translated UI copy", () => {
    expect(DEFAULT_LANGUAGE).toBe("hu");
    expect(t("dashboard.heroTitle")).toBe(
      "Építészeti realizmus a kompozíció módosítása nélkül."
    );
  });

  it("falls back to English when a translation key is missing in the active locale", () => {
    expect(t("nonExisting.key", "hu")).toBe("nonExisting.key");
    expect(t("dashboard.openWorkspace", "hu")).toBe("Munkaterület megnyitása");
    expect(t("dashboard.openWorkspace", "en")).toBe("Open workspace");
  });

  it("guards supported languages", () => {
    expect(isSupportedLanguage("hu")).toBe(true);
    expect(isSupportedLanguage("en")).toBe(true);
    expect(isSupportedLanguage("de")).toBe(false);
  });
});

describe("theme preferences", () => {
  it("defaults to dark mode and toggles predictably", () => {
    expect(DEFAULT_THEME).toBe("dark");
    expect(getNextTheme("dark")).toBe("light");
    expect(getNextTheme("light")).toBe("dark");
  });

  it("normalizes unsafe persisted theme values", () => {
    expect(normalizeThemePreference("light")).toBe("light");
    expect(normalizeThemePreference("unexpected")).toBe("dark");
    expect(normalizeThemePreference(null)).toBe("dark");
  });
});

describe("export destinations", () => {
  it("keeps local export available and marks external integrations as setup-required", () => {
    expect(EXPORT_DESTINATIONS).toHaveLength(4);
    expect(getExportDestination("local")?.configured).toBe(true);
    expect(getExportDestination("google-drive")?.configured).toBe(false);
    expect(getExportDestination("email")?.setupRequired).toBe(true);
  });

  it("normalizes unsupported export destinations to local download", () => {
    expect(normalizeExportDestination("onedrive")).toBe("onedrive");
    expect(normalizeExportDestination("dropbox")).toBe("local");
  });
});
