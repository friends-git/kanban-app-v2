"use client";

import { Box, Stack, Typography } from "@mui/material";
import { AutoFlowCanvas } from "@/components/flowcharts/auto-flow-canvas";
import { FlowCanvasShell } from "@/components/flowcharts/flow-canvas-shell";
import { FlowDiagramList } from "@/components/flowcharts/flow-diagram-list";
import { FlowTabs } from "@/components/flowcharts/flow-tabs";
import { ManualFlowCanvas } from "@/components/flowcharts/manual-flow-canvas";
import { FlowEmptyState } from "@/components/flowcharts/flow-empty-state";
import { type FlowchartContent } from "@/lib/flowcharts";
import { FlowchartScopeType, SprintStatus, TaskStatus } from "@prisma/client";

type FlowModulePageProps = {
  projectId: string;
  currentMode: "auto" | "manual";
  tabs: Array<{
    label: string;
    value: string;
    href: string;
    count?: number;
  }>;
  canManage: boolean;
  auto: {
    tasks: Array<{
      id: string;
      code: string;
      title: string;
      status: TaskStatus;
      blocked: boolean;
      sprint: {
        id: string;
        name: string;
        status: SprintStatus;
      } | null;
      assignees: Array<{
        id: string;
        name: string;
        avatarColor?: string | null;
      }>;
      dependencies: Array<{
        dependsOnTaskId: string;
      }>;
    }>;
    selectedTaskId?: string | null;
    selectedTask?: {
      id: string;
      code: string;
      title: string;
      status: TaskStatus;
      blocked: boolean;
      sprintName: string | null;
      dependencyTitles: string[];
      assigneeNames: string[];
    } | null;
  };
  manual: {
    selectedDiagramId?: string | null;
    selectedFlowchart: {
      id: string;
      name: string;
      description: string | null;
      scopeType: FlowchartScopeType;
      canManage: boolean;
      updatedAt: string;
      project: {
        id: string;
        name: string;
      } | null;
      task: {
        id: string;
        code: string;
        title: string;
      } | null;
      content: FlowchartContent;
    } | null;
    flowcharts: Array<{
      id: string;
      name: string;
      description: string | null;
      updatedAt: string;
      createdBy: {
        name: string;
      } | null;
      href: string;
      openHref: string;
    }>;
    createRedirectBaseHref: string;
  };
};

export function FlowModulePage({
  projectId,
  currentMode,
  tabs,
  canManage,
  auto,
  manual,
}: FlowModulePageProps) {
  return (
    <Stack spacing={2}>
      <Stack spacing={0.8}>
        <Typography
          variant="overline"
          sx={{ color: "secondary.main", letterSpacing: "0.14em" }}
        >
          Fluxos
        </Typography>
        <Typography variant="h3">Whiteboard do projeto</Typography>
        <Typography color="text.secondary">
          Visualize dependências reais do trabalho e crie diagramas manuais com a mesma linguagem do produto.
        </Typography>
      </Stack>

      <FlowTabs value={currentMode} items={tabs} />

      {currentMode === "auto" ? (
        <AutoFlowCanvas
          tasks={auto.tasks}
          selectedTaskId={auto.selectedTaskId}
          selectedTask={auto.selectedTask}
        />
      ) : manual.selectedFlowchart ? (
        <ManualFlowCanvas
          flowchart={manual.selectedFlowchart}
          openHref={
            manual.flowcharts.find((flowchart) => flowchart.id === manual.selectedFlowchart?.id)
              ?.openHref
          }
          sidebar={
            <FlowDiagramList
              projectId={projectId}
              canManage={canManage}
              selectedId={manual.selectedDiagramId}
              createRedirectBaseHref={manual.createRedirectBaseHref}
              items={manual.flowcharts}
            />
          }
        />
      ) : (
        <FlowCanvasShell
          title="Diagramas"
          description="Crie e selecione um whiteboard para este projeto sem sair da aba de Fluxos."
          sidebar={
            <FlowDiagramList
              projectId={projectId}
              canManage={canManage}
              selectedId={manual.selectedDiagramId}
              createRedirectBaseHref={manual.createRedirectBaseHref}
              items={manual.flowcharts}
            />
          }
          canvas={
            <Box sx={{ p: 3 }}>
              <FlowEmptyState
                title="Nenhum diagrama selecionado"
                message="Escolha um diagrama da lista ou crie um novo quadro visual para este projeto."
              />
            </Box>
          }
        />
      )}
    </Stack>
  );
}
