import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";

/**
 * Common chrome for the four legal / contact placeholder pages
 * (/jogi/adatkezeles, /jogi/aszf, /jogi/impresszum, /kapcsolat).
 *
 * Real legal text needs a lawyer — this shell exists so the route
 * structure, navigation, and search/robots metadata are in place,
 * and so a footer link from the marketing landing doesn't 404.
 *
 * The placeholder banner makes it obvious to any visitor (and to any
 * later contributor) that the body content is non-final.
 */
export function LegalPageShell({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="app-shell min-h-screen px-4 py-8 text-foreground sm:px-6">
      <div className="mx-auto w-full max-w-3xl">
        <Link
          href="/"
          className={buttonVariants({
            variant: "ghost",
            size: "sm",
            className: "text-muted-foreground",
          })}
        >
          <ArrowLeft data-icon="inline-start" />
          Vissza a főoldalra
        </Link>

        <div className="mt-8 rounded-2xl border border-amber-500/20 bg-amber-500/5 px-5 py-4 text-sm text-amber-200">
          <strong className="font-semibold">Placeholder tartalom.</strong>{" "}
          Ez az oldal jogi szakértői véglegesítés alatt áll — a végleges
          szöveg a hatályos magyar és EU-szabályozás szerint kerül majd be.
        </div>

        <header className="mt-10">
          <p className="text-[0.7rem] uppercase tracking-[0.22em] text-muted-foreground">
            {eyebrow}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {title}
          </h1>
        </header>

        <div className="prose prose-invert mt-8 max-w-none text-sm leading-7 text-zinc-300 [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground [&_a]:underline">
          {children}
        </div>
      </div>
    </div>
  );
}
