import type { Metadata } from "next";

import { LegalPageShell } from "@/components/legal/legal-page-shell";
import { BRAND } from "@/config/brand";

export const metadata: Metadata = {
  title: "Kapcsolat",
  description: `Vegye fel velünk a kapcsolatot — ${BRAND.name}.`,
};

export default function KapcsolatPage() {
  return (
    <LegalPageShell eyebrow="Üzleti kapcsolat" title="Kapcsolat">
      <p>
        Köszönjük az érdeklődést a {BRAND.name} iránt. Pilot bevezetésre,
        Studio licencre, Enterprise demóra és technikai kérdésekre is
        szívesen válaszolunk.
      </p>

      <h2>Elérhetőségek</h2>
      <ul>
        <li>
          <strong>E-mail:</strong> [TODO — info@formaveris.hu]
        </li>
        <li>
          <strong>Cég:</strong> {BRAND.legalName}
        </li>
      </ul>

      <h2>Pilot bevezetés és Studio licenc</h2>
      <p>
        A pilot bevezetés egyedi megállapodás alapján indul. Kérjük, küldje
        el a stúdió/projekt rövid leírását, és pár napon belül felvesszük
        Önnel a kapcsolatot.
      </p>

      <h2>Enterprise demó</h2>
      <p>
        Nagyobb szervezetnek belső demót, on-premise telepítési útmutatót
        és governance-stratégiát biztosítunk. Kérjük, az e-mailben
        jelezze a felhasználói létszámot és az integrációs igényeket.
      </p>
    </LegalPageShell>
  );
}
