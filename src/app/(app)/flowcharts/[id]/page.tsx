import { ArrowBackRounded } from "@mui/icons-material";
import { Button, Stack } from "@mui/material";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FlowchartScopeType } from "@prisma/client";
import { FlowchartEditor } from "@/components/flowcharts/flowchart-editor";
import { PageHeader } from "@/components/ui/page-header";
import { requireUser } from "@/server/auth/session";
import { getFlowchartDetail } from "@/server/services/flowcharts";

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
  const flowchart = await getFlowchartDetail(id, user);

  if (!flowchart) {
    notFound();
  }

  const backHref =
    flowchart.scopeType === FlowchartScopeType.TASK && flowchart.task && flowchart.project
      ? `/projects/${flowchart.project.id}?taskId=${flowchart.task.id}`
      : flowchart.project
        ? `/projects/${flowchart.project.id}?section=flows&flowView=manual`
        : "/projects";

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
          flowchart.scopeType === FlowchartScopeType.TASK
            ? "Diagrama da tarefa"
            : "Diagrama do projeto",
          flowchart.project?.name ?? "Projeto",
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
      />
    </Stack>
  );
}
