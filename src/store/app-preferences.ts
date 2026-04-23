"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import {
  DEFAULT_LANGUAGE,
  normalizeLanguagePreference,
  type Language,
} from "@/i18n";

export const THEMES = ["dark", "light"] as const;
export type ThemePreference = (typeof THEMES)[number];
export const DEFAULT_THEME: ThemePreference = "dark";

type AppPreferencesStore = {
  language: Language;
  theme: ThemePreference;
  setLanguage: (language: Language) => void;
  setTheme: (theme: ThemePreference) => void;
  toggleTheme: () => void;
};

export function normalizeThemePreference(value: unknown): ThemePreference {
  return value === "light" || value === "dark" ? value : DEFAULT_THEME;
}

export function getNextTheme(theme: ThemePreference): ThemePreference {
  return theme === "dark" ? "light" : "dark";
}

export const useAppPreferencesStore = create<AppPreferencesStore>()(
  persist(
    (set) => ({
      language: DEFAULT_LANGUAGE,
      theme: DEFAULT_THEME,
      setLanguage: (language) =>
        set({ language: normalizeLanguagePreference(language) }),
      setTheme: (theme) => set({ theme: normalizeThemePreference(theme) }),
      toggleTheme: () =>
        set((state) => ({ theme: getNextTheme(state.theme) })),
    }),
    {
      name: "render2real-preferences",
      partialize: (state) => ({
        language: state.language,
        theme: state.theme,
      }),
      merge: (persistedState, currentState) => {
        const persisted =
          typeof persistedState === "object" && persistedState !== null
            ? (persistedState as Partial<AppPreferencesStore>)
            : {};

        return {
          ...currentState,
          language: normalizeLanguagePreference(persisted.language),
          theme: normalizeThemePreference(persisted.theme),
        };
      },
    }
  )
);
