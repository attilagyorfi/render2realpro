import { redirect } from "next/navigation";

/**
 * Legacy root-level route. The canonical location is /app/projects/[id].
 * Kept here only as a permanent redirect.
 */
type PageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function LegacyProjectPage({ params }: PageProps) {
  const { projectId } = await params;
  redirect(`/app/projects/${projectId}`);
}
