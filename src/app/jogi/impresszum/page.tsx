import type { Metadata } from "next";

import { LegalPageShell } from "@/components/legal/legal-page-shell";
import { BRAND } from "@/config/brand";

export const metadata: Metadata = {
  title: "Impresszum",
  description: `${BRAND.name} impresszum — szolgáltató cégadatok.`,
};

export default function ImpresszumPage() {
  return (
    <LegalPageShell eyebrow="Jogi tudnivalók" title="Impresszum">
      <p>
        A {BRAND.name} szolgáltatás üzemeltetője és tartalmáért felelős
        kiadója a {BRAND.legalName}.
      </p>

      <h2>Cégadatok</h2>
      <ul>
        <li>
          <strong>Cégnév:</strong> {BRAND.legalName}
        </li>
        <li>
          <strong>Székhely:</strong> [TODO — pontos cím]
        </li>
        <li>
          <strong>Cégjegyzékszám:</strong> [TODO]
        </li>
        <li>
          <strong>Adószám:</strong> [TODO]
        </li>
        <li>
          <strong>Nyilvántartó bíróság:</strong> [TODO]
        </li>
      </ul>

      <h2>Kapcsolat</h2>
      <ul>
        <li>
          <strong>E-mail:</strong> [TODO — info@formaveris.hu vagy hasonló]
        </li>
        <li>
          <strong>Telefon:</strong> [TODO]
        </li>
      </ul>

      <p>
        A pontos cégadatok rögzítése folyamatban van. Részletekért keressen
        minket a <a href="/kapcsolat">kapcsolat</a> oldalon.
      </p>
    </LegalPageShell>
  );
}
