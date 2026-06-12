import { redirect } from "next/navigation";

/**
 * Provider status moved into Settings as a section (user feedback,
 * 2026-06-12). Kept as a redirect so bookmarks survive.
 */
export default function AppProvidersPage() {
  redirect("/app/settings");
}
