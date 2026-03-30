"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Alert,
  Button,
  Divider,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { FlowchartScopeType } from "@prisma/client";
import { flowchartScopeLabels } from "@/lib/domain";
import { formatFullDate } from "@/lib/formatters";
import { updateFlowchartRelationAction } from "@/server/actions/flowcharts";

type FlowchartRelationPanelProps = {
  flowchart: {
    id: string;
    scopeType: FlowchartScopeType;
    canManage: boolean;
    createdAt: string;
    updatedAt: string;
    createdBy: {
      name: string;
    } | null;
    project: {
      id: string;
      name: string;
    } | null;
    task: {
      id: string;
      code: string;
      title: string;
    } | null;
  };
  relationOptions: {
    projects: Array<{
      id: string;
      name: string;
      tasks: Array<{
        id: string;
        code: string;
        title: string;
      }>;
    }>;
  };
};

export function FlowchartRelationPanel({
  flowchart,
  relationOptions,
}: FlowchartRelationPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);
  const [scopeType, setScopeType] = useState<FlowchartScopeType>(flowchart.scopeType);
  const [projectId, setProjectId] = useState(flowchart.project?.id ?? "");
  const [taskId, setTaskId] = useState(flowchart.task?.id ?? "");

  const availableTasks = useMemo(
    () => relationOptions.projects.find((project) => project.id === projectId)?.tasks ?? [],
    [projectId, relationOptions.projects],
  );

  const currentScopeLabel =
    flowchart.scopeType === FlowchartScopeType.TASK && flowchart.task
      ? `${flowchartScopeLabels[flowchart.scopeType]} · ${flowchart.task.code}`
      : flowchart.scopeType === FlowchartScopeType.PROJECT && flowchart.project
        ? `${flowchartScopeLabels[flowchart.scopeType]} · ${flowchart.project.name}`
        : flowchartScopeLabels[flowchart.scopeType];

  const isDirty =
    scopeType !== flowchart.scopeType ||
    projectId !== (flowchart.project?.id ?? "") ||
    taskId !== (flowchart.task?.id ?? "");

  const handleSave = () => {
    setMessage(null);

    startTransition(async () => {
      const result = await updateFlowchartRelationAction({
        flowchartId: flowchart.id,
        scopeType,
        projectId: scopeType === FlowchartScopeType.PROJECT ? projectId : null,
        taskId: scopeType === FlowchartScopeType.TASK ? taskId : null,
      });

      if (!result.ok) {
        setMessage({ type: "error", text: result.error });
        return;
      }

      setMessage({ type: "success", text: "Vínculo do diagrama atualizado." });
      router.refresh();
    });
  };

  return (
    <Stack spacing={2}>
      <Stack spacing={0.6}>
        <Typography
          variant="overline"
          sx={{ color: "secondary.main", letterSpacing: "0.14em" }}
        >
          Contexto
        </Typography>
        <Typography variant="h4">Vínculo do diagrama</Typography>
        <Typography color="text.secondary" variant="body2">
          Crie diagramas soltos no workspace e relacione depois com projeto ou tarefa quando o
          fluxo amadurecer.
        </Typography>
      </Stack>

      {message ? <Alert severity={message.type}>{message.text}</Alert> : null}

      <Stack spacing={1}>
        <Typography fontWeight={700} variant="body2">
          Escopo atual
        </Typography>
        <Typography color="text.secondary" variant="body2">
          {currentScopeLabel}
        </Typography>
        {flowchart.task ? (
          <Typography color="text.secondary" variant="caption">
            Tarefa vinculada: {flowchart.task.code} · {flowchart.task.title}
          </Typography>
        ) : null}
        {flowchart.project ? (
          <Typography color="text.secondary" variant="caption">
            Projeto de referência: {flowchart.project.name}
          </Typography>
        ) : null}
      </Stack>

      <Divider />

      {flowchart.canManage ? (
        <Stack spacing={1.5}>
          <TextField
            select
            label="Relacionar como"
            value={scopeType}
            onChange={(event) => {
              const nextScope = event.target.value as FlowchartScopeType;
              setScopeType(nextScope);

              if (nextScope === FlowchartScopeType.WORKSPACE) {
                setProjectId("");
                setTaskId("");
                return;
              }

              if (nextScope === FlowchartScopeType.PROJECT) {
                setTaskId("");
              }
            }}
          >
            <MenuItem value={FlowchartScopeType.WORKSPACE}>Diagrama solto</MenuItem>
            <MenuItem value={FlowchartScopeType.PROJECT}>Diagrama do projeto</MenuItem>
            <MenuItem value={FlowchartScopeType.TASK}>Diagrama da tarefa</MenuItem>
          </TextField>

          {scopeType !== FlowchartScopeType.WORKSPACE ? (
            <TextField
              select
              label="Projeto"
              value={projectId}
              onChange={(event) => {
                setProjectId(event.target.value);
                setTaskId("");
              }}
            >
              {relationOptions.projects.map((project) => (
                <MenuItem key={project.id} value={project.id}>
                  {project.name}
                </MenuItem>
              ))}
            </TextField>
          ) : null}

          {scopeType === FlowchartScopeType.TASK ? (
            <TextField
              select
              label="Tarefa"
              value={taskId}
              onChange={(event) => setTaskId(event.target.value)}
              disabled={!projectId}
            >
              {availableTasks.map((task) => (
                <MenuItem key={task.id} value={task.id}>
                  {task.code} · {task.title}
                </MenuItem>
              ))}
            </TextField>
          ) : null}

          <Button
            onClick={handleSave}
            variant="contained"
            disabled={
              isPending ||
              !isDirty ||
              (scopeType === FlowchartScopeType.PROJECT && !projectId) ||
              (scopeType === FlowchartScopeType.TASK && (!projectId || !taskId))
            }
          >
            {isPending ? "Salvando..." : "Salvar vínculo"}
          </Button>
        </Stack>
      ) : (
        <Typography color="text.secondary" variant="body2">
          Você pode visualizar este diagrama, mas não alterar o vínculo atual.
        </Typography>
      )}

      <Divider />

      <Stack spacing={0.75}>
        <Typography fontWeight={700} variant="body2">
          Metadados
        </Typography>
        <Typography color="text.secondary" variant="caption">
          Criado por {flowchart.createdBy?.name ?? "workspace"} em{" "}
          {formatFullDate(flowchart.createdAt)}.
        </Typography>
        <Typography color="text.secondary" variant="caption">
          Última atualização em {formatFullDate(flowchart.updatedAt)}.
        </Typography>
      </Stack>
    </Stack>
  );
}
