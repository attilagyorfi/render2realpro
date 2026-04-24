"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { useEffect, useState } from "react";

import { useAppPreferencesStore } from "@/store/app-preferences";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const language = useAppPreferencesStore((state) => state.language);
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 10_000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  useEffect(() => {
    const root = document.documentElement;
    // Theme is permanently locked to dark mode — no toggle available
    root.classList.remove("light");
    root.classList.add("dark");
    root.lang = language;
    const timeout = window.setTimeout(() => {
      root.classList.remove("theme-transitioning");
    }, 1400);

    return () => window.clearTimeout(timeout);
  }, [language]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  );
}
