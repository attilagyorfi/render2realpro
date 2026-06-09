import type { MetadataRoute } from "next";

/**
 * /app/*           — behind auth, no value to search engines
 * /api/*           — JSON endpoints, never meant for crawlers
 * /share/*         — confidential share links; per-route metadata also
 *                    sets robots:noindex as belt-and-braces
 * /login, /register — handled via per-route robots: noindex, but
 *                     no need to crawl them either
 */
export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://formaveris.hu";
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/app", "/api", "/share", "/login", "/register"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
