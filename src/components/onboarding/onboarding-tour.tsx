"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, ChevronLeft, Sparkles, FolderOpen, SlidersHorizontal, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const TOUR_KEY = "render2real_onboarding_v1";

type Step = {
  icon: React.ReactNode;
  title: string;
  titleHu: string;
  body: string;
  bodyHu: string;
};

const STEPS: Step[] = [
  {
    icon: <FolderOpen className="size-6 text-blue-400" />,
    title: "Upload your renders",
    titleHu: "Töltsd fel a rendereket",
    body: "Drag and drop your architectural renders into the project files panel on the left. You can upload multiple images at once or load an entire folder.",
    bodyHu: "Húzd a bal oldali projektfájlok panelre az építészeti rendereidet. Egyszerre több képet is feltölthetsz, vagy egy egész mappát is betölthetsz.",
  },
  {
    icon: <Sparkles className="size-6 text-violet-400" />,
    title: "Choose a preset and generate",
    titleHu: "Válassz presetet és generálj",
    body: "Select a preset that matches your project type (Commercial, Residential, Industrial…), then click Auto enhance. The AI will make your render photorealistic while preserving the geometry.",
    bodyHu: "Válassz egy presetet a projekted típusához (Kereskedelmi, Lakó, Ipari…), majd kattints az Automatikus javítás gombra. Az AI fotórealisztikussá teszi a renderedet, miközben megőrzi a geometriát.",
  },
  {
    icon: <SlidersHorizontal className="size-6 text-emerald-400" />,
    title: "Fine-tune with sliders",
    titleHu: "Finomhangolás csúszkákkal",
    body: "Use the brightness, contrast, highlights and other sliders to adjust the result. Click the Compare button to see a side-by-side before/after view.",
    bodyHu: "Használd a fényerő, kontraszt, csúcsfények és egyéb csúszkákat az eredmény finomhangolásához. Kattints az Összehasonlítás gombra az előtte/utána nézet megnyitásához.",
  },
  {
    icon: <Share2 className="size-6 text-pink-400" />,
    title: "Export or share",
    titleHu: "Export vagy megosztás",
    body: "Download your result in PNG, JPEG, or WebP format. Or generate a public share link to show the before/after comparison to your client.",
    bodyHu: "Töltsd le az eredményt PNG, JPEG vagy WebP formátumban. Vagy generálj egy nyilvános megosztási linket, amellyel megmutathatod az előtte/utána összehasonlítást az ügyfélnek.",
  },
];

export function OnboardingTour({ language = "en" }: { language?: string }) {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const seen = localStorage.getItem(TOUR_KEY);
    if (!seen) setVisible(true);
  }, []);

  function dismiss() {
    localStorage.setItem(TOUR_KEY, "1");
    setVisible(false);
  }

  const isHu = language === "hu";
  const current = STEPS[step];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="onboarding-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 16 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="relative w-full max-w-md rounded-[28px] border border-white/10 bg-[#0d1117] p-8 shadow-2xl"
          >
            {/* Close */}
            <button
              type="button"
              onClick={dismiss}
              className="absolute right-4 top-4 flex size-7 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-500 hover:text-zinc-200 transition"
            >
              <X className="size-3.5" />
            </button>

            {/* Step indicator */}
            <div className="flex items-center gap-1.5 mb-6">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`h-1 rounded-full transition-all ${
                    i === step ? "w-6 bg-violet-500" : "w-2 bg-white/15"
                  }`}
                />
              ))}
            </div>

            {/* Icon */}
            <div className="mb-4 flex size-12 items-center justify-center rounded-[16px] border border-white/10 bg-white/5">
              {current.icon}
            </div>

            {/* Content */}
            <h2 className="text-lg font-semibold text-zinc-100 mb-2">
              {isHu ? current.titleHu : current.title}
            </h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              {isHu ? current.bodyHu : current.body}
            </p>

            {/* Navigation */}
            <div className="mt-8 flex items-center justify-between">
              <button
                type="button"
                onClick={dismiss}
                className="text-xs text-zinc-600 hover:text-zinc-400 transition"
              >
                {isHu ? "Kihagyom" : "Skip tour"}
              </button>
              <div className="flex items-center gap-2">
                {step > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-white/10 text-zinc-400"
                    onClick={() => setStep((s) => s - 1)}
                  >
                    <ChevronLeft className="size-3.5" />
                  </Button>
                )}
                {step < STEPS.length - 1 ? (
                  <Button
                    size="sm"
                    className="bg-gradient-to-r from-violet-600 to-purple-600 text-white border-0 px-5"
                    onClick={() => setStep((s) => s + 1)}
                  >
                    {isHu ? "Következő" : "Next"}
                    <ChevronRight className="size-3.5 ml-1" />
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="bg-gradient-to-r from-violet-600 to-purple-600 text-white border-0 px-5"
                    onClick={dismiss}
                  >
                    {isHu ? "Kezdjük el!" : "Get started!"}
                    <Sparkles className="size-3.5 ml-1" />
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
