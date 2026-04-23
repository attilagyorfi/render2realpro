import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function GET() {
  const logs = await prisma.generationLog.findMany({
    include: {
      imageAsset: {
        select: {
          id: true,
          originalFileName: true,
          projectId: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ logs });
}
