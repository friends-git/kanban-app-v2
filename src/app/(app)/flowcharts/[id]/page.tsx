import { ArrowBackRounded } from "@mui/icons-material";
import { Button, Stack } from "@mui/material";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FlowchartScopeType } from "@prisma/client";
import { FlowchartEditor } from "@/components/flowcharts/flowchart-editor";
import { FlowchartRelationPanel } from "@/components/flowcharts/flowchart-relation-panel";
import { PageHeader } from "@/components/ui/page-header";
import { flowchartScopeLabels } from "@/lib/domain";
import { requireUser } from "@/server/auth/session";
import { getFlowchartDetail } from "@/server/services/flowcharts";
import { listFlowchartRelationOptions } from "@/server/services/reference-data";

type FlowchartDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function FlowchartDetailPage({
  params,
}: FlowchartDetailPageProps) {
  const user = await requireUser();
  const { id } = await params;
  const [flowchart, relationOptions] = await Promise.all([
    getFlowchartDetail(id, user),
    listFlowchartRelationOptions(user),
  ]);

  if (!flowchart) {
    notFound();
  }

  const backHref =
    flowchart.scopeType === FlowchartScopeType.TASK && flowchart.task && flowchart.project
      ? `/projects/${flowchart.project.id}?taskId=${flowchart.task.id}`
      : flowchart.project
        ? `/projects/${flowchart.project.id}?section=flows&flowView=manual`
        : "/flowcharts";

  return (
    <Stack spacing={3}>
      <PageHeader
        eyebrow="Fluxos"
        title={flowchart.name}
        description={
          flowchart.description ??
          "Edite este diagrama em uma superfície ampla e mantenha o fluxo vinculado ao contexto real do projeto."
        }
        chips={[
          flowchartScopeLabels[flowchart.scopeType],
          flowchart.project?.name ?? "Workspace",
          flowchart.task ? flowchart.task.code : "Canvas manual",
        ]}
        actions={
          <Button
            component={Link}
            href={backHref}
            variant="outlined"
            startIcon={<ArrowBackRounded />}
          >
            Voltar
          </Button>
        }
      />

      <FlowchartEditor
        flowchart={{
          id: flowchart.id,
          name: flowchart.name,
          description: flowchart.description,
          scopeType: flowchart.scopeType,
          canManage: flowchart.canManage,
          updatedAt: flowchart.updatedAt.toISOString(),
          project: flowchart.project,
          task: flowchart.task,
          content: flowchart.content,
        }}
        sidebar={
          <FlowchartRelationPanel
            flowchart={{
              id: flowchart.id,
              scopeType: flowchart.scopeType,
              canManage: flowchart.canManage,
              createdAt: flowchart.createdAt.toISOString(),
              updatedAt: flowchart.updatedAt.toISOString(),
              createdBy: flowchart.createdBy
                ? {
                    name: flowchart.createdBy.name,
                  }
                : null,
              project: flowchart.project,
              task: flowchart.task,
            }}
            relationOptions={relationOptions}
          />
        }
      />
    </Stack>
  );
}
