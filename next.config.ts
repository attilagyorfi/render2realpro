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
};

export default nextConfig;
