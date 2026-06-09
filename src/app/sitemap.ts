import type { MetadataRoute } from "next";

/**
 * Generate the public sitemap. Lists every page that should be in
 * search results, with stable `changeFrequency` and `priority` hints.
 * /app/*, /api/*, /share/* are intentionally absent — those live behind
 * auth or contain confidential project data and are also blocked in
 * robots.ts.
 *
 * lastModified is the current process start; that's fine for the
 * marketing site, which doesn't change often. If we later add a
 * content-management surface we can swap it for the last-edited
 * timestamp of each page.
 */
const PUBLIC_ROUTES: Array<{
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
}> = [
  { path: "/", changeFrequency: "weekly", priority: 1.0 },
  { path: "/preview", changeFrequency: "monthly", priority: 0.8 },
  { path: "/jogi/adatkezeles", changeFrequency: "yearly", priority: 0.3 },
  { path: "/jogi/aszf", changeFrequency: "yearly", priority: 0.3 },
  { path: "/jogi/impresszum", changeFrequency: "yearly", priority: 0.3 },
  { path: "/kapcsolat", changeFrequency: "monthly", priority: 0.5 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://formaveris.hu";
  const lastModified = new Date();
  return PUBLIC_ROUTES.map((route) => ({
    url: `${siteUrl}${route.path}`,
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
