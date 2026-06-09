import type { Metadata } from "next";

import { LegalPageShell } from "@/components/legal/legal-page-shell";
import { BRAND } from "@/config/brand";

export const metadata: Metadata = {
  title: "Általános Szerződési Feltételek",
  description: `A ${BRAND.name} szolgáltatás Általános Szerződési Feltételei.`,
};

export default function AszfPage() {
  return (
    <LegalPageShell
      eyebrow="Jogi tudnivalók"
      title="Általános Szerződési Feltételek"
    >
      <p>
        Ez az oldal hamarosan tartalmazni fogja a {BRAND.name} szolgáltatás
        teljes ÁSZF-jét, beleértve:
      </p>
      <ul>
        <li>a szolgáltatás tárgyát és igénybevételének feltételeit,</li>
        <li>a szerződéskötés menetét és az árazási modellt,</li>
        <li>a szolgáltatás-szintű vállalásokat (SLA, rendelkezésre állás),</li>
        <li>a felelősségi szabályokat és a kártérítés szabályait,</li>
        <li>a szellemi alkotásokra vonatkozó rendelkezéseket (az ügyfél által feltöltött renderek és a generált képek jogállása),</li>
        <li>a szerződés megszűnésének eseteit és a panaszkezelési eljárást.</li>
      </ul>
      <p>
        A pilot fázisban a {BRAND.legalName} egyedi megállapodás alapján
        biztosítja a szolgáltatást. Részletekért keresse a{" "}
        <a href="/kapcsolat">kapcsolat</a> oldalon megadott elérhetőséget.
      </p>
    </LegalPageShell>
  );
}
