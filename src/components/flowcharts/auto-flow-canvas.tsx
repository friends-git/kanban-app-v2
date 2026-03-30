"use client";

import "@xyflow/react/dist/style.css";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  type Edge,
  type Node,
  type NodeProps,
  type OnInit,
  type ReactFlowInstance,
} from "@xyflow/react";
import {
  AdsClickRounded,
  FitScreenRounded,
  PanToolAltRounded,
} from "@mui/icons-material";
import {
  Box,
  Button,
  MenuItem,
  Stack,
  TextField,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SprintStatus, TaskStatus } from "@prisma/client";
import { FlowCanvasShell } from "@/components/flowcharts/flow-canvas-shell";
import { FlowEdgeRenderer, type FlowEdgeData } from "@/components/flowcharts/flow-edge-renderer";
import { FlowInspectorPanel } from "@/components/flowcharts/flow-inspector-panel";
import { FlowNodeCard } from "@/components/flowcharts/flow-node-card";
import { FlowToolbar } from "@/components/flowcharts/flow-toolbar";
import { FlowEmptyState } from "@/components/flowcharts/flow-empty-state";
import { taskStatusLabels } from "@/lib/domain";

type AutoFlowCanvasProps = {
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

type AutoNodeData = {
  code: string;
  title: string;
  status: TaskStatus;
  blocked: boolean;
  sprintName: string | null;
  isCurrentSprint: boolean;
  assigneeNames: string[];
  highlighted: boolean;
  muted: boolean;
};

type AutoCanvasNode = Node<AutoNodeData, "task">;
type AutoCanvasEdge = Edge<FlowEdgeData, "flow">;
type CanvasMode = "select" | "hand";

const nodeTypes = {
  task: AutoTaskNodeRenderer,
};

const edgeTypes = {
  flow: FlowEdgeRenderer,
};

const AUTO_FLOW_HANDLE_IDS = {
  targetLeft: "target-left",
  sourceRight: "source-right",
  targetTop: "target-top",
  sourceBottom: "source-bottom",
} as const;

const statusOrder: TaskStatus[] = [
  TaskStatus.BACKLOG,
  TaskStatus.TODO,
  TaskStatus.IN_PROGRESS,
  TaskStatus.REVIEW,
  TaskStatus.DONE,
];

const canvasModes: Array<{
  id: CanvasMode;
  label: string;
  icon: React.ReactNode;
}> = [
  {
    id: "select",
    label: "Selecionar",
    icon: <AdsClickRounded fontSize="small" />,
  },
  {
    id: "hand",
    label: "Mover visão",
    icon: <PanToolAltRounded fontSize="small" />,
  },
];

export function AutoFlowCanvas(props: AutoFlowCanvasProps) {
  return (
    <ReactFlowProvider>
      <AutoFlowCanvasInner {...props} />
    </ReactFlowProvider>
  );
}

function AutoFlowCanvasInner({
  tasks,
  selectedTaskId,
  selectedTask,
}: AutoFlowCanvasProps) {
  const theme = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const flowInstanceRef = useRef<ReactFlowInstance<AutoCanvasNode, AutoCanvasEdge> | null>(null);
  const [mode, setMode] = useState<CanvasMode>("select");
  const [statusFilter, setStatusFilter] = useState<"ALL" | TaskStatus>("ALL");
  const [sprintFilter, setSprintFilter] = useState<string>("ALL");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("ALL");

  const availableSprints = useMemo(() => {
    const sprintMap = new Map<string, { id: string; name: string }>();

    tasks.forEach((task) => {
      if (task.sprint) {
        sprintMap.set(task.sprint.id, {
          id: task.sprint.id,
          name: task.sprint.name,
        });
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

  const filteredTaskIds = useMemo(
    () => new Set(filteredTasks.map((task) => task.id)),
    [filteredTasks],
  );

  const highlighted = useMemo(
    () => buildHighlightedGraph(filteredTasks, selectedTaskId),
    [filteredTasks, selectedTaskId],
  );

  const graph = useMemo(() => {
    const positions = buildLayout(filteredTasks);

    const nodes: AutoCanvasNode[] = filteredTasks.map((task) => ({
      id: task.id,
      type: "task",
      position: positions.get(task.id) ?? { x: 0, y: 0 },
      draggable: false,
      selectable: true,
      data: {
        code: task.code,
        title: task.title,
        status: task.status,
        blocked: task.blocked,
        sprintName: task.sprint?.name ?? null,
        isCurrentSprint: task.sprint?.status === SprintStatus.ACTIVE,
        assigneeNames: task.assignees.map((assignee) => assignee.name),
        highlighted: !selectedTaskId || highlighted.nodeIds.has(task.id),
        muted: Boolean(selectedTaskId) && !highlighted.nodeIds.has(task.id),
      },
    }));

    const edges: AutoCanvasEdge[] = filteredTasks.flatMap((task) =>
      task.dependencies
        .filter((dependency) => filteredTaskIds.has(dependency.dependsOnTaskId))
        .map((dependency) => {
          const edgeId = `${dependency.dependsOnTaskId}-${task.id}`;
          const edgeHighlighted = highlighted.edgeIds.has(edgeId);

          return {
            id: edgeId,
            type: "flow",
            source: dependency.dependsOnTaskId,
            target: task.id,
            sourceHandle: AUTO_FLOW_HANDLE_IDS.sourceRight,
            targetHandle: AUTO_FLOW_HANDLE_IDS.targetLeft,
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 22,
              height: 22,
              color: edgeHighlighted ? "#FFBB00" : "#5D05FF",
            },
            data: {
              accent: edgeHighlighted ? "gold" : "violet",
              highlighted: edgeHighlighted,
              muted: Boolean(selectedTaskId) && !edgeHighlighted,
            },
          };
        }),
    );

    return {
      nodes,
      edges,
    };
  }, [filteredTaskIds, filteredTasks, highlighted.edgeIds, highlighted.nodeIds, selectedTaskId]);

  const handleInit: OnInit<AutoCanvasNode, AutoCanvasEdge> = (instance) => {
    flowInstanceRef.current = instance;
    void instance.fitView({
      padding: 0.16,
      duration: 0,
    });
  };

  const handleFitView = () => {
    if (!flowInstanceRef.current) {
      return;
    }

    void flowInstanceRef.current.fitView({
      padding: 0.16,
      duration: 220,
    });
  };

  const handleNodeClick = (_event: React.MouseEvent, node: AutoCanvasNode) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("taskId", node.id);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handlePaneClick = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("taskId");
    const nextQuery = params.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  };

  const toolbar = (
    <FlowToolbar
      items={canvasModes.map((item) => ({
        id: item.id,
        label: item.label,
        icon: item.icon,
        active: mode === item.id,
        onClick: () => setMode(item.id),
      }))}
    />
  );

  const sidebar = (
    <Stack spacing={2}>
      <Box>
        <Typography
          variant="overline"
          sx={{ color: "secondary.main", letterSpacing: "0.14em" }}
        >
          Filtros
        </Typography>
        <Typography variant="h3" sx={{ mt: 0.35 }}>
          Trabalho vivo
        </Typography>
      </Box>

      <TextField
        size="small"
        select
        label="Status"
        value={statusFilter}
        onChange={(event) => setStatusFilter(event.target.value as "ALL" | TaskStatus)}
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

      <Button onClick={handleFitView} variant="outlined" startIcon={<FitScreenRounded />}>
        Ajustar visão
      </Button>
    </Stack>
  );

  const inspector = (
    <FlowInspectorPanel
      eyebrow="Task"
      title={selectedTask ? selectedTask.title : "Fluxo automático"}
      description={
        selectedTask
          ? "A seleção destaca dependências anteriores e posteriores desta tarefa no grafo."
          : "Selecione uma task para destacar o caminho e abrir o drawer lateral."
      }
    >
      {selectedTask ? (
        <Stack spacing={1.25}>
          <Typography fontWeight={800}>
            {selectedTask.code} · {selectedTask.title}
          </Typography>
          <Typography color="text.secondary" variant="body2">
            {taskStatusLabels[selectedTask.status]} ·{" "}
            {selectedTask.blocked ? "Bloqueada" : "Sem bloqueio"}
          </Typography>
          {selectedTask.sprintName ? (
            <Typography color="text.secondary" variant="body2">
              Sprint: {selectedTask.sprintName}
            </Typography>
          ) : null}
          <Typography color="text.secondary" variant="body2">
            Responsáveis:{" "}
            {selectedTask.assigneeNames.length
              ? selectedTask.assigneeNames.join(", ")
              : "Sem responsáveis"}
          </Typography>
          <Typography color="text.secondary" variant="body2">
            Dependências:{" "}
            {selectedTask.dependencyTitles.length
              ? selectedTask.dependencyTitles.join(", ")
              : "Nenhuma"}
          </Typography>
        </Stack>
      ) : undefined}
    </FlowInspectorPanel>
  );

  const canvas = filteredTasks.length ? (
    <Box
      sx={{
        height: 720,
        background:
          "radial-gradient(circle at top, rgba(93, 5, 255, 0.06), transparent 24%), radial-gradient(circle at bottom right, rgba(255, 187, 0, 0.08), transparent 20%)",
      }}
    >
      <ReactFlow<AutoCanvasNode, AutoCanvasEdge>
        nodes={graph.nodes}
        edges={graph.edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onInit={handleInit}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        panOnScroll
        panOnDrag={mode === "hand"}
        elementsSelectable={mode === "select"}
        nodesDraggable={false}
        nodesConnectable={false}
        proOptions={{ hideAttribution: true }}
        fitViewOptions={{ padding: 0.16 }}
        minZoom={0.3}
        maxZoom={1.6}
      >
        <Background
          gap={22}
          size={1}
          color={alpha(theme.palette.text.secondary, 0.08)}
        />
        <MiniMap
          pannable
          zoomable
          nodeBorderRadius={18}
          nodeColor={(node) =>
            node.data.highlighted
              ? alpha("#FFBB00", 0.55)
              : alpha(theme.palette.text.secondary, 0.2)
          }
          maskColor={alpha(theme.palette.background.default, 0.72)}
        />
        <Controls showInteractive={false} />
      </ReactFlow>
    </Box>
  ) : (
    <Box sx={{ p: 3 }}>
      <FlowEmptyState
        title="Nada com esses filtros"
        message="Ajuste sprint, status ou responsável para voltar a visualizar o fluxo automático do projeto."
      />
    </Box>
  );

  return (
    <FlowCanvasShell
      title="Fluxo automático"
      description="Uma leitura viva das tarefas e dependências reais do projeto, com a mesma linguagem do whiteboard manual."
      actions={
        <Button onClick={handleFitView} variant="contained" startIcon={<FitScreenRounded />}>
          Ajustar visão
        </Button>
      }
      toolbar={toolbar}
      sidebar={sidebar}
      inspector={inspector}
      canvas={canvas}
      footer={
        <Box
          sx={{
            px: 1.25,
            py: 0.9,
            borderRadius: 999,
            bgcolor: alpha(theme.palette.background.paper, 0.84),
            border: "1px solid",
            borderColor: "divider",
            width: "fit-content",
            boxShadow: "0 12px 28px rgba(7, 6, 12, 0.12)",
          }}
        >
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            {filteredTasks.length} tarefas visíveis · clique em um nó para abrir a task
          </Typography>
        </Box>
      }
    />
  );
}

function AutoTaskNodeRenderer({ data, selected }: NodeProps<AutoCanvasNode>) {
  return (
    <>
      <Handle
        id={AUTO_FLOW_HANDLE_IDS.targetLeft}
        type="target"
        position={Position.Left}
        isConnectable={false}
      />
      <Handle
        id={AUTO_FLOW_HANDLE_IDS.sourceRight}
        type="source"
        position={Position.Right}
        isConnectable={false}
      />
      <Handle
        id={AUTO_FLOW_HANDLE_IDS.targetTop}
        type="target"
        position={Position.Top}
        isConnectable={false}
      />
      <Handle
        id={AUTO_FLOW_HANDLE_IDS.sourceBottom}
        type="source"
        position={Position.Bottom}
        isConnectable={false}
      />
      <Box
        sx={{
          opacity: data.muted ? 0.42 : 1,
          transition: "opacity 180ms ease",
        }}
      >
        <FlowNodeCard
          variant="task"
          code={data.code}
          label={data.title}
          status={data.status}
          blocked={data.blocked}
          sprintName={data.sprintName}
          isCurrentSprint={data.isCurrentSprint}
          assigneeNames={data.assigneeNames}
          highlighted={data.highlighted}
          selected={selected}
        />
      </Box>
    </>
  );
}

function buildLayout(tasks: AutoFlowCanvasProps["tasks"]) {
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

  const columns = new Map<number, AutoFlowCanvasProps["tasks"]>();

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
            x: depth * 420,
            y: index * 212,
          });
        });
    });

  return positions;
}

function buildHighlightedGraph(
  tasks: AutoFlowCanvasProps["tasks"],
  selectedTaskId?: string | null,
) {
  if (!selectedTaskId) {
    return {
      nodeIds: new Set<string>(),
      edgeIds: new Set<string>(),
    };
  }

  const dependenciesMap = new Map<string, string[]>();
  const dependentsMap = new Map<string, string[]>();

  tasks.forEach((task) => {
    dependenciesMap.set(
      task.id,
      task.dependencies.map((dependency) => dependency.dependsOnTaskId),
    );

    task.dependencies.forEach((dependency) => {
      dependentsMap.set(dependency.dependsOnTaskId, [
        ...(dependentsMap.get(dependency.dependsOnTaskId) ?? []),
        task.id,
      ]);
    });
  });

  const nodeIds = new Set<string>([selectedTaskId]);
  const edgeIds = new Set<string>();

  const walk = (originId: string, map: Map<string, string[]>, forward: boolean) => {
    const queue = [originId];
    const seen = new Set<string>([originId]);

    while (queue.length) {
      const current = queue.shift()!;
      const nextIds = map.get(current) ?? [];

      nextIds.forEach((nextId) => {
        nodeIds.add(nextId);
        edgeIds.add(forward ? `${current}-${nextId}` : `${nextId}-${current}`);

        if (!seen.has(nextId)) {
          seen.add(nextId);
          queue.push(nextId);
        }
      });
    }
  };

  walk(selectedTaskId, dependenciesMap, false);
  walk(selectedTaskId, dependentsMap, true);

  return {
    nodeIds,
    edgeIds,
  };
}
