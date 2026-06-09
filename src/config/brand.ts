/**
 * brand.ts
 *
 * Single source of truth for the product brand. Every place that needs
 * the product name, tagline, legal entity, or default meta description
 * should import from here instead of hard-coding the string — so that
 * the next rename touches one file, not seventeen.
 *
 * Keep this list short and stable. If a piece of copy is context-
 * specific (a landing-page hero, a CTA), it belongs in the i18n
 * dictionary or the component, not here.
 */

export const BRAND = {
  /** Public product name, shown in nav bars, page titles, footers. */
  name: "FormaVeris",
  /** Legal entity behind the product. Used in eyebrow lines and footers. */
  legalName: "M Mérnöki Iroda Kft.",
  /** Short tagline used in OG/Twitter meta and the auth shell hint. */
  tagline: "Architectural render realism — without changing the design.",
  /** One-sentence English description; magyar variant lives in i18n. */
  description:
    "Photorealistic architectural delivery imagery from approved 3D renders — preserving exact geometry, camera angle, and scene layout.",
  /** Lowercase slug, useful for class names, localStorage keys, etc. */
  slug: "formaveris",
} as const;

export type Brand = typeof BRAND;
