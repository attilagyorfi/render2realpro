import { NextResponse } from "next/server";

import pkg from "../../../../package.json";

/**
 * GET /api/health
 *
 * Liveness + identity probe for the Next.js process. Used by Railway's
 * healthcheck and any external uptime monitor. Returns deliberately
 * minimal information — name, version, uptime, timestamp — so a botched
 * deploy or rollback is identifiable from outside without exposing any
 * configuration secrets.
 *
 * Cache disabled so an intermediary CDN can't keep serving stale data
 * after a deploy.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      name: pkg.name,
      version: pkg.version,
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}
