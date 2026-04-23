import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  allowedDevOrigins: [
    "3001-irxjgl119qosou98yc4fh-129ade7d.us2.manus.computer",
    "*.manus.computer",
  ],
};

export default nextConfig;
