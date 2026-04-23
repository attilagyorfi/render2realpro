import { NextResponse } from "next/server";

import { getProviderStatusSnapshot } from "@/services/providers/provider-registry";

export async function GET() {
  return NextResponse.json(getProviderStatusSnapshot());
}
