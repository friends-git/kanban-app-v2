import { requireUser } from "@/server/auth/session";
import { canManageWorkspaceFlowchart } from "@/server/permissions";
import { listVisibleFlowcharts } from "@/server/services/flowcharts";
import { FlowchartsDirectoryPage } from "@/components/flowcharts/flowcharts-directory-page";

export default async function FlowchartsPage() {
  const user = await requireUser();
  const sections = await listVisibleFlowcharts(user);

  return (
    <FlowchartsDirectoryPage
      canCreateWorkspaceFlowchart={canManageWorkspaceFlowchart(user)}
      sections={{
        workspace: sections.workspace.map((flowchart) => ({
          ...flowchart,
          updatedAt: flowchart.updatedAt.toISOString(),
          createdAt: flowchart.createdAt.toISOString(),
        })),
        tasks: sections.tasks.map((flowchart) => ({
          ...flowchart,
          updatedAt: flowchart.updatedAt.toISOString(),
          createdAt: flowchart.createdAt.toISOString(),
        })),
        projects: sections.projects.map((flowchart) => ({
          ...flowchart,
          updatedAt: flowchart.updatedAt.toISOString(),
          createdAt: flowchart.createdAt.toISOString(),
        })),
      }}
    />
  );
}
