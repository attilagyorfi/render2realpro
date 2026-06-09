import { redirect } from "next/navigation";

/**
 * Legacy root-level route. The canonical location is /app/settings.
 * Kept here only as a permanent redirect.
 */
export default function LegacySettingsPage() {
  redirect("/app/settings");
}
