"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { useEffect, useState } from "react";

import { useAppPreferencesStore } from "@/store/app-preferences";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const theme = useAppPreferencesStore((state) => state.theme);
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
    root.classList.add("theme-transitioning");
    root.classList.remove("dark", "light");
    root.classList.add(theme);
    root.lang = language;
    const timeout = window.setTimeout(() => {
      root.classList.remove("theme-transitioning");
    }, 1400);

    return () => window.clearTimeout(timeout);
  }, [language, theme]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  );
}
