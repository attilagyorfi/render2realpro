import { WorkspaceView } from "@/components/workspace/workspace-view";

type PageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function AppProjectPage({ params }: PageProps) {
  const { projectId } = await params;
  return <WorkspaceView projectId={projectId} />;
}
