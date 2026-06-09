import type { Metadata } from "next";

import { LegalPageShell } from "@/components/legal/legal-page-shell";
import { BRAND } from "@/config/brand";

export const metadata: Metadata = {
  title: "Adatkezelési tájékoztató",
  description: `A ${BRAND.name} adatkezelési tájékoztatója.`,
};

export default function AdatkezelesPage() {
  return (
    <LegalPageShell
      eyebrow="Jogi tudnivalók"
      title="Adatkezelési tájékoztató"
    >
      <p>
        Ez az oldal hamarosan tartalmazni fogja a {BRAND.name} szolgáltatás
        teljes adatkezelési tájékoztatóját, beleértve:
      </p>
      <ul>
        <li>az adatkezelő pontos adatait,</li>
        <li>a kezelt személyes adatok körét és az adatkezelés jogalapját,</li>
        <li>az adatok tárolásának időtartamát,</li>
        <li>az érintettek jogait (hozzáférés, helyesbítés, törlés, tiltakozás),</li>
        <li>a jogorvoslati lehetőségeket (NAIH, bíróság),</li>
        <li>a szolgáltatáshoz használt harmadik fél eszközöket (Fal.ai, hosting).</li>
      </ul>
      <p>
        Addig is a részletekért kérjük, vegye fel velünk a kapcsolatot a{" "}
        <a href="/kapcsolat">kapcsolat</a> oldalon.
      </p>
    </LegalPageShell>
  );
}
