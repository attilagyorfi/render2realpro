import type { Metadata } from "next";

import { ShareView } from "@/components/share/share-view";

/**
 * Share links can reveal confidential client renders, so we explicitly
 * opt them out of search-engine indexing even if the share URL leaks.
 * robots.ts also blocks /share globally — this is belt-and-braces.
 */
export const metadata: Metadata = {
  title: "Megosztott projekt",
  robots: { index: false, follow: false, nocache: true },
};

export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <ShareView token={token} />;
}
