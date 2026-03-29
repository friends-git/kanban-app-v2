"use client";

import "@xyflow/react/dist/style.css";

import { useEffect, useMemo, useState } from "react";
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import { alpha, Box, Chip, MenuItem, Stack, TextField, Typography, useTheme } from "@mui/material";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { TaskStatus } from "@prisma/client";
import { EmptyState } from "@/components/ui/empty-state";
import { taskStatusLabels } from "@/lib/domain";

type ProjectAutomaticFlowProps = {
  tasks: Array<{
    id: string;
    code: string;
    title: string;
    status: TaskStatus;
    blocked: boolean;
    sprint: {
      id: string;
      name: string;
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
};

type AutoTaskNodeData = {
  code: string;
  title: string;
  status: TaskStatus;
  blocked: boolean;
  sprintName: string | null;
  assigneeNames: string[];
};

type AutoTaskNodeType = Node<AutoTaskNodeData, "taskNode">;

const nodeTypes = {
  taskNode: AutoTaskNode,
};

const statusOrder: TaskStatus[] = [
  TaskStatus.BACKLOG,
  TaskStatus.TODO,
  TaskStatus.IN_PROGRESS,
  TaskStatus.REVIEW,
  TaskStatus.DONE,
];

const statusColors: Record<TaskStatus, string> = {
  BACKLOG: "#8C839F",
  TODO: "#5D05FF",
  IN_PROGRESS: "#FFBB00",
  REVIEW: "#8A54FF",
  DONE: "#18B56A",
};

const NODE_WIDTH = 280;
const NODE_HEIGHT = 136;
const COLUMN_GAP = 120;
const ROW_GAP = 36;

export function ProjectAutomaticFlow({ tasks }: ProjectAutomaticFlowProps) {
  const theme = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [statusFilter, setStatusFilter] = useState<"ALL" | TaskStatus>("ALL");
  const [sprintFilter, setSprintFilter] = useState<string>("ALL");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("ALL");

  const availableSprints = useMemo(() => {
    const sprintMap = new Map<string, { id: string; name: string }>();

    tasks.forEach((task) => {
      if (task.sprint) {
        sprintMap.set(task.sprint.id, task.sprint);
      }
    });

    return Array.from(sprintMap.values()).sort((left, right) => left.name.localeCompare(right.name));
  }, [tasks]);

  const availableAssignees = useMemo(() => {
    const assigneeMap = new Map<string, { id: string; name: string }>();

    tasks.forEach((task) => {
      task.assignees.forEach((assignee) => {
        assigneeMap.set(assignee.id, {
          id: assignee.id,
          name: assignee.name,
        });
      });
    });

    return Array.from(assigneeMap.values()).sort((left, right) => left.name.localeCompare(right.name));
  }, [tasks]);

  useEffect(() => {
    if (sprintFilter !== "ALL" && !availableSprints.some((sprint) => sprint.id === sprintFilter)) {
      setSprintFilter("ALL");
    }
  }, [availableSprints, sprintFilter]);

  useEffect(() => {
    if (
      assigneeFilter !== "ALL" &&
      !availableAssignees.some((assignee) => assignee.id === assigneeFilter)
    ) {
      setAssigneeFilter("ALL");
    }
  }, [availableAssignees, assigneeFilter]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (statusFilter !== "ALL" && task.status !== statusFilter) {
        return false;
      }

      if (sprintFilter !== "ALL" && task.sprint?.id !== sprintFilter) {
        return false;
      }

      if (
        assigneeFilter !== "ALL" &&
        !task.assignees.some((assignee) => assignee.id === assigneeFilter)
      ) {
        return false;
      }

      return true;
    });
  }, [assigneeFilter, sprintFilter, statusFilter, tasks]);

  const taskIds = useMemo(() => new Set(filteredTasks.map((task) => task.id)), [filteredTasks]);

  const graph = useMemo(() => {
    const positions = buildLayout(filteredTasks);

    const nodes: AutoTaskNodeType[] = filteredTasks.map((task) => ({
      id: task.id,
      type: "taskNode",
      draggable: false,
      selectable: true,
      position: positions.get(task.id) ?? { x: 0, y: 0 },
      data: {
        code: task.code,
        title: task.title,
        status: task.status,
        blocked: task.blocked,
        sprintName: task.sprint?.name ?? null,
        assigneeNames: task.assignees.map((assignee) => assignee.name),
      },
    }));

    const edges: Edge[] = filteredTasks.flatMap((task) =>
      task.dependencies
        .filter((dependency) => taskIds.has(dependency.dependsOnTaskId))
        .map((dependency) => ({
          id: `${dependency.dependsOnTaskId}-${task.id}`,
          source: dependency.dependsOnTaskId,
          target: task.id,
          animated: task.status === TaskStatus.IN_PROGRESS,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: alpha(theme.palette.secondary.main, 0.7),
          },
          style: {
            stroke: alpha(theme.palette.secondary.main, 0.58),
            strokeWidth: 1.8,
          },
        })),
    );

    return {
      nodes,
      edges,
    };
  }, [filteredTasks, taskIds, theme.palette.secondary.main]);

  const handleNodeClick = (_event: React.MouseEvent, node: AutoTaskNodeType) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("taskId", node.id);

    router.replace(`${pathname}?${params.toString()}`, {
      scroll: false,
    });
  };

  if (!tasks.length) {
    return (
      <EmptyState
        title="Sem tarefas para o fluxo"
        message="Adicione tarefas e dependências no projeto para visualizar o grafo automático."
      />
    );
  }

  return (
    <Stack spacing={2}>
      <Box
        sx={{
          display: "grid",
          gap: 1.5,
          gridTemplateColumns: {
            xs: "1fr",
            md: "repeat(3, minmax(0, 1fr))",
          },
        }}
      >
        <TextField
          size="small"
          select
          label="Status"
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(event.target.value as "ALL" | TaskStatus)
          }
        >
          <MenuItem value="ALL">Todos os status</MenuItem>
          {statusOrder.map((status) => (
            <MenuItem key={status} value={status}>
              {taskStatusLabels[status]}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          size="small"
          select
          label="Sprint"
          value={sprintFilter}
          onChange={(event) => setSprintFilter(event.target.value)}
        >
          <MenuItem value="ALL">Todas as sprints</MenuItem>
          {availableSprints.map((sprint) => (
            <MenuItem key={sprint.id} value={sprint.id}>
              {sprint.name}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          size="small"
          select
          label="Responsável"
          value={assigneeFilter}
          onChange={(event) => setAssigneeFilter(event.target.value)}
        >
          <MenuItem value="ALL">Todos os responsáveis</MenuItem>
          {availableAssignees.map((assignee) => (
            <MenuItem key={assignee.id} value={assignee.id}>
              {assignee.name}
            </MenuItem>
          ))}
        </TextField>
      </Box>

      {filteredTasks.length ? (
        <Box
          sx={{
            height: 640,
            borderRadius: 6,
            overflow: "hidden",
            border: "1px solid",
            borderColor: "divider",
            bgcolor: alpha(theme.palette.background.paper, 0.7),
          }}
        >
          <ReactFlow<AutoTaskNodeType, Edge>
            fitView
            proOptions={{ hideAttribution: true }}
            nodes={graph.nodes}
            edges={graph.edges}
            nodeTypes={nodeTypes}
            onNodeClick={handleNodeClick}
            nodesConnectable={false}
            nodesDraggable={false}
            panOnDrag
            fitViewOptions={{ padding: 0.16 }}
            defaultEdgeOptions={{
              markerEnd: {
                type: MarkerType.ArrowClosed,
              },
            }}
          >
            <Background
              gap={22}
              size={1}
              color={alpha(theme.palette.text.secondary, 0.08)}
            />
            <Controls showInteractive={false} />
          </ReactFlow>
        </Box>
      ) : (
        <EmptyState
          title="Nenhum nó com esses filtros"
          message="Ajuste sprint, status ou responsável para voltar a visualizar o fluxo."
        />
      )}
    </Stack>
  );
}

function AutoTaskNode({ data, selected }: NodeProps<AutoTaskNodeType>) {
  const theme = useTheme();
  const statusColor = statusColors[data.status];

  return (
    <Box
      sx={{
        width: NODE_WIDTH,
        minHeight: NODE_HEIGHT,
        borderRadius: 5,
        border: "1px solid",
        borderColor: selected ? "secondary.main" : "divider",
        bgcolor: alpha(theme.palette.background.paper, 0.96),
        boxShadow: selected
          ? "0 24px 52px rgba(93, 5, 255, 0.18)"
          : "0 20px 46px rgba(7, 6, 12, 0.16)",
        p: 2,
      }}
    >
      <Handle type="target" position={Position.Left} isConnectable={false} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right} isConnectable={false} style={{ opacity: 0 }} />

      <Stack spacing={1.15}>
        <Stack direction="row" justifyContent="space-between" spacing={1} alignItems="center">
          <Typography
            variant="overline"
            sx={{ color: "secondary.main", letterSpacing: "0.14em" }}
          >
            {data.code}
          </Typography>
          <Chip
            label={taskStatusLabels[data.status]}
            size="small"
            sx={{
              bgcolor: alpha(statusColor, 0.14),
              color: statusColor,
              borderRadius: 999,
              fontWeight: 700,
            }}
          />
        </Stack>

        <Typography
          sx={{
            fontWeight: 800,
            fontSize: 15.5,
            lineHeight: 1.24,
            letterSpacing: "-0.02em",
          }}
        >
          {data.title}
        </Typography>

        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          {data.blocked ? (
            <Chip
              label="Bloqueada"
              size="small"
              sx={{
                bgcolor: alpha(theme.palette.warning.main, 0.14),
                color: "warning.main",
                fontWeight: 700,
              }}
            />
          ) : null}
          {data.sprintName ? (
            <Chip
              label={data.sprintName}
              size="small"
              sx={{
                bgcolor: "action.hover",
                color: "text.secondary",
              }}
            />
          ) : null}
        </Stack>

        <Typography color="text.secondary" variant="body2">
          {data.assigneeNames.length
            ? data.assigneeNames.join(", ")
            : "Sem responsáveis definidos"}
        </Typography>
      </Stack>
    </Box>
  );
}

function buildLayout(tasks: ProjectAutomaticFlowProps["tasks"]) {
  const taskMap = new Map(tasks.map((task) => [task.id, task]));
  const depthMap = new Map<string, number>();

  const getDepth = (taskId: string, trail: Set<string>): number => {
    if (depthMap.has(taskId)) {
      return depthMap.get(taskId) ?? 0;
    }

    if (trail.has(taskId)) {
      return 0;
    }

    const task = taskMap.get(taskId);

    if (!task) {
      return 0;
    }

    const nextTrail = new Set(trail);
    nextTrail.add(taskId);

    const depth: number = task.dependencies.length
      ? Math.max(
          ...task.dependencies.map((dependency) => 1 + getDepth(dependency.dependsOnTaskId, nextTrail)),
        )
      : 0;

    depthMap.set(taskId, depth);
    return depth;
  };

  tasks.forEach((task) => {
    getDepth(task.id, new Set<string>());
  });

  const columns = new Map<number, ProjectAutomaticFlowProps["tasks"]>();

  tasks.forEach((task) => {
    const depth = depthMap.get(task.id) ?? 0;
    columns.set(depth, [...(columns.get(depth) ?? []), task]);
  });

  const positions = new Map<string, { x: number; y: number }>();

  Array.from(columns.entries())
    .sort(([left], [right]) => left - right)
    .forEach(([depth, columnTasks]) => {
      columnTasks
        .slice()
        .sort((left, right) => {
          const statusDelta = statusOrder.indexOf(left.status) - statusOrder.indexOf(right.status);

          if (statusDelta !== 0) {
            return statusDelta;
          }

          return left.title.localeCompare(right.title);
        })
        .forEach((task, index) => {
          positions.set(task.id, {
            x: depth * (NODE_WIDTH + COLUMN_GAP),
            y: index * (NODE_HEIGHT + ROW_GAP),
          });
        });
    });

  return positions;
}
