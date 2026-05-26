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
};

export default nextConfig;
