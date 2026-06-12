import { redirect } from "next/navigation";

/**
 * The generation log moved into Settings as a section (user feedback,
 * 2026-06-12) — it doesn't carry enough day-to-day information to be a
 * top-level page. Kept as a redirect so bookmarks survive.
 */
export default function AppHistoryPage() {
  redirect("/app/settings");
}
