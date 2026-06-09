import { redirect } from "next/navigation";

/**
 * Legacy root-level route. The canonical location is /app/history.
 * Kept here only as a permanent redirect so old bookmarks / docs links
 * still work.
 */
export default function LegacyHistoryPage() {
  redirect("/app/history");
}
