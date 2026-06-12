import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  // Add any non-localhost dev hostnames here that you want Next.js's
  // dev-origin check to accept (e.g. a remote dev tunnel). Production
  // builds ignore this list.
  allowedDevOrigins: [],
  images: {
    // Serve modern formats when the browser supports them; falls back to
    // the original on older clients.
    formats: ["image/avif", "image/webp"],
    // The hero image only really needs a few breakpoints. Cuts down on
    // the number of variants the image optimizer materialises.
    deviceSizes: [640, 828, 1080, 1280, 1600, 1920],
    // Cache optimised variants for a day so a hot landing page doesn't
    // re-encode on every request.
    minimumCacheTTL: 86400,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // The app is never meant to be embedded — block clickjacking.
          { key: "X-Frame-Options", value: "DENY" },
          // Don't let browsers guess MIME types on served files (the
          // /api/files route serves user uploads).
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // We use none of these — say so explicitly.
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
          // Ignored over plain HTTP (local dev), enforced once the
          // production deploy serves HTTPS (Railway does by default).
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          // TODO(security): add a Content-Security-Policy once the asset
          // origins are stable. Draft (needs validation against Next.js
          // inline runtime chunks and the Fal CDN before enabling):
          //   default-src 'self'; img-src 'self' data: blob: https://*.fal.media;
          //   script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'
        ],
      },
    ];
  },
};

export default nextConfig;
