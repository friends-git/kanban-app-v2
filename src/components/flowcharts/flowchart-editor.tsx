"use client";

import "@xyflow/react/dist/style.css";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  addEdge,
  Background,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
  type OnInit,
  type ReactFlowInstance,
} from "@xyflow/react";
import {
  AddRounded,
  DeleteOutlineRounded,
  SaveRounded,
} from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Stack,
  TextField,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { FlowchartScopeType } from "@prisma/client";
import {
  createFlowEntityId,
  type FlowchartContent,
} from "@/lib/flowcharts";
import { saveFlowchartAction } from "@/server/actions/flowcharts";
import { formatFullDate } from "@/lib/formatters";

type FlowchartEditorProps = {
  flowchart: {
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
  };
};

type ManualFlowNodeData = {
  label: string;
};

type ManualFlowNodeType = Node<ManualFlowNodeData, "manualNode">;

const nodeTypes = {
  manualNode: ManualFlowNode,
};

export function FlowchartEditor({ flowchart }: FlowchartEditorProps) {
  return (
    <ReactFlowProvider>
      <FlowchartEditorInner flowchart={flowchart} />
    </ReactFlowProvider>
  );
}

function FlowchartEditorInner({ flowchart }: FlowchartEditorProps) {
  const theme = useTheme();
  const router = useRouter();
  const flowInstanceRef = useRef<ReactFlowInstance<ManualFlowNodeType, Edge> | null>(null);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(
    null,
  );
  const [name, setName] = useState(flowchart.name);
  const [description, setDescription] = useState(flowchart.description ?? "");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  const initialState = useMemo(() => mapContentToFlow(flowchart.content), [flowchart.content]);
  const [nodes, setNodes, onNodesChange] = useNodesState<ManualFlowNodeType>(initialState.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialState.edges);

  useEffect(() => {
    setName(flowchart.name);
    setDescription(flowchart.description ?? "");
    const nextState = mapContentToFlow(flowchart.content);
    setNodes(nextState.nodes);
    setEdges(nextState.edges);
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setMessage(null);
  }, [flowchart, setEdges, setNodes]);

  const selectedNode = nodes.find((node) => node.id === selectedNodeId) ?? null;
  const selectedEdge = edges.find((edge) => edge.id === selectedEdgeId) ?? null;

  const handleInit: OnInit<ManualFlowNodeType, Edge> = (instance) => {
    flowInstanceRef.current = instance;

    if (flowchart.content.viewport) {
      void instance.setViewport(flowchart.content.viewport, { duration: 0 });
      return;
    }

    if (flowchart.content.nodes.length) {
      void instance.fitView({
        padding: 0.18,
        duration: 0,
      });
    }
  };

  const handleConnect = (connection: Connection) => {
    if (!flowchart.canManage || !connection.source || !connection.target) {
      return;
    }

    setEdges((currentEdges) =>
      addEdge(
        {
          id: createFlowEntityId("edge"),
          source: connection.source,
          target: connection.target,
          markerEnd: {
            type: MarkerType.ArrowClosed,
          },
        },
        currentEdges,
      ),
    );
  };

  const handleAddNode = () => {
    if (!flowchart.canManage) {
      return;
    }

    const instance = flowInstanceRef.current;
    const position = instance
      ? instance.screenToFlowPosition({ x: 320, y: 220 })
      : { x: 120, y: 120 };
    const nodeId = createFlowEntityId("node");

    setNodes((currentNodes) => [
      ...currentNodes,
      {
        id: nodeId,
        type: "manualNode",
        position,
        data: {
          label: "Novo nó",
        },
      },
    ]);
    setSelectedNodeId(nodeId);
    setSelectedEdgeId(null);
  };

  const handleDeleteSelection = () => {
    if (!flowchart.canManage) {
      return;
    }

    if (selectedNodeId) {
      setNodes((currentNodes) => currentNodes.filter((node) => node.id !== selectedNodeId));
      setEdges((currentEdges) =>
        currentEdges.filter(
          (edge) => edge.source !== selectedNodeId && edge.target !== selectedNodeId,
        ),
      );
      setSelectedNodeId(null);
    }

    if (selectedEdgeId) {
      setEdges((currentEdges) => currentEdges.filter((edge) => edge.id !== selectedEdgeId));
      setSelectedEdgeId(null);
    }
  };

  const handleNodeLabelChange = (value: string) => {
    if (!selectedNodeId) {
      return;
    }

    setNodes((currentNodes) =>
      currentNodes.map((node) =>
        node.id === selectedNodeId
          ? {
              ...node,
              data: {
                label: value,
              },
            }
          : node,
      ),
    );
  };

  const handleSave = () => {
    setMessage(null);

    startTransition(async () => {
      const result = await saveFlowchartAction({
        flowchartId: flowchart.id,
        name,
        description,
        content: serializeFlow(nodes, edges, flowInstanceRef.current),
      });

      if (!result.ok) {
        setMessage({ type: "error", text: result.error });
        return;
      }

      setMessage({ type: "success", text: "Diagrama salvo." });
      router.refresh();
    });
  };

  return (
    <Stack spacing={2.5}>
      {message ? <Alert severity={message.type}>{message.text}</Alert> : null}

      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: {
            xs: "1fr",
            xl: "minmax(0, 1fr) 320px",
          },
          alignItems: "start",
        }}
      >
        <Stack spacing={2}>
          <Box
            sx={{
              p: 2.25,
              borderRadius: 6,
              border: "1px solid",
              borderColor: "divider",
              bgcolor: "background.paper",
            }}
          >
            <Stack
              direction={{ xs: "column", lg: "row" }}
              justifyContent="space-between"
              spacing={2}
            >
              <Stack spacing={1.5} sx={{ flex: 1, minWidth: 0 }}>
                <TextField
                  label="Nome do diagrama"
                  value={name}
                  disabled={!flowchart.canManage}
                  onChange={(event) => setName(event.target.value)}
                />
                <TextField
                  label="Descrição"
                  multiline
                  minRows={2}
                  value={description}
                  disabled={!flowchart.canManage}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </Stack>

              <Stack
                direction="row"
                spacing={1}
                useFlexGap
                flexWrap="wrap"
                justifyContent={{ xs: "flex-start", lg: "flex-end" }}
              >
                {flowchart.canManage ? (
                  <>
                    <Button
                      onClick={handleAddNode}
                      variant="outlined"
                      startIcon={<AddRounded />}
                    >
                      Adicionar nó
                    </Button>
                    <Button
                      onClick={handleSave}
                      variant="contained"
                      startIcon={<SaveRounded />}
                      disabled={isPending}
                    >
                      {isPending ? "Salvando..." : "Salvar"}
                    </Button>
                  </>
                ) : null}
              </Stack>
            </Stack>
          </Box>

          <Box
            sx={{
              height: "72vh",
              minHeight: 560,
              borderRadius: 6,
              overflow: "hidden",
              border: "1px solid",
              borderColor: "divider",
              bgcolor: alpha(theme.palette.background.paper, 0.78),
            }}
          >
            <ReactFlow<ManualFlowNodeType, Edge>
              fitView
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onInit={handleInit}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={handleConnect}
              nodesDraggable={flowchart.canManage}
              nodesConnectable={flowchart.canManage}
              elementsSelectable
              panOnDrag
              proOptions={{ hideAttribution: true }}
              defaultEdgeOptions={{
                markerEnd: {
                  type: MarkerType.ArrowClosed,
                },
                style: {
                  stroke: alpha(theme.palette.secondary.main, 0.58),
                  strokeWidth: 1.8,
                },
              }}
              fitViewOptions={{ padding: 0.16 }}
              onSelectionChange={({ nodes: nextNodes, edges: nextEdges }) => {
                setSelectedNodeId(nextNodes[0]?.id ?? null);
                setSelectedEdgeId(nextEdges[0]?.id ?? null);
              }}
            >
              <Background
                gap={20}
                size={1}
                color={alpha(theme.palette.text.secondary, 0.08)}
              />
              <MiniMap
                pannable
                zoomable
                nodeBorderRadius={18}
                maskColor={alpha(theme.palette.background.default, 0.72)}
                nodeColor={() => alpha(theme.palette.secondary.main, 0.24)}
              />
              <Controls showInteractive={false} />
            </ReactFlow>
          </Box>
        </Stack>

        <Box
          sx={{
            p: 2.25,
            borderRadius: 6,
            border: "1px solid",
            borderColor: "divider",
            bgcolor: "background.paper",
          }}
        >
          <Stack spacing={2}>
            <Box>
              <Typography
                variant="overline"
                sx={{ color: "secondary.main", letterSpacing: "0.14em" }}
              >
                Inspector
              </Typography>
              <Typography variant="h3" sx={{ mt: 0.5 }}>
                {selectedNode
                  ? "Nó selecionado"
                  : selectedEdge
                    ? "Conexão selecionada"
                    : "Canvas"}
              </Typography>
            </Box>

            {selectedNode ? (
              <Stack spacing={1.5}>
                <TextField
                  label="Texto do nó"
                  value={selectedNode.data.label}
                  disabled={!flowchart.canManage}
                  onChange={(event) => handleNodeLabelChange(event.target.value)}
                />
                <Typography color="text.secondary" variant="body2">
                  Arraste o nó no canvas e conecte pelas laterais para montar o diagrama.
                </Typography>
              </Stack>
            ) : null}

            {selectedEdge ? (
              <Typography color="text.secondary" variant="body2">
                Conexão entre <strong>{selectedEdge.source}</strong> e{" "}
                <strong>{selectedEdge.target}</strong>.
              </Typography>
            ) : null}

            {!selectedNode && !selectedEdge ? (
              <Stack spacing={1}>
                <Typography color="text.secondary" variant="body2">
                  {flowchart.canManage
                    ? "Selecione um nó para editar o texto, use as alças laterais para conectar e salve quando terminar."
                    : "Este diagrama está em modo de leitura para você."}
                </Typography>
                <Typography color="text.secondary" variant="caption">
                  Atualizado em {formatFullDate(flowchart.updatedAt)}.
                </Typography>
                {flowchart.project ? (
                  <Typography color="text.secondary" variant="caption">
                    Projeto: {flowchart.project.name}
                  </Typography>
                ) : null}
                {flowchart.task ? (
                  <Typography color="text.secondary" variant="caption">
                    Tarefa: {flowchart.task.code} · {flowchart.task.title}
                  </Typography>
                ) : null}
              </Stack>
            ) : null}

            {flowchart.canManage && (selectedNode || selectedEdge) ? (
              <Button
                onClick={handleDeleteSelection}
                variant="outlined"
                color="error"
                startIcon={<DeleteOutlineRounded />}
              >
                Remover seleção
              </Button>
            ) : null}

            <Box
              sx={{
                p: 1.5,
                borderRadius: 4,
                bgcolor:
                  flowchart.scopeType === FlowchartScopeType.TASK
                    ? alpha(theme.palette.secondary.main, 0.08)
                    : alpha(theme.palette.primary.main, 0.08),
              }}
            >
              <Typography fontWeight={700}>
                {flowchart.scopeType === FlowchartScopeType.TASK
                  ? "Diagrama vinculado à tarefa"
                  : "Diagrama manual do projeto"}
              </Typography>
              <Typography color="text.secondary" variant="body2" sx={{ mt: 0.5 }}>
                {flowchart.scopeType === FlowchartScopeType.TASK
                  ? "Ideal para detalhar lógica, decisões e microfluxos da execução."
                  : "Use este canvas para fluxos operacionais, decisões arquiteturais ou visões complementares do projeto."}
              </Typography>
            </Box>
          </Stack>
        </Box>
      </Box>
    </Stack>
  );
}

function ManualFlowNode({
  data,
  selected,
}: NodeProps<ManualFlowNodeType>) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        minWidth: 220,
        maxWidth: 280,
        borderRadius: 5,
        border: "1px solid",
        borderColor: selected ? "secondary.main" : "divider",
        bgcolor: alpha(theme.palette.background.paper, 0.98),
        boxShadow: selected
          ? "0 20px 44px rgba(93, 5, 255, 0.16)"
          : "0 16px 38px rgba(7, 6, 12, 0.14)",
        px: 2,
        py: 1.5,
      }}
    >
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
      <Typography
        sx={{
          fontWeight: 700,
          lineHeight: 1.35,
          letterSpacing: "-0.02em",
          whiteSpace: "pre-wrap",
        }}
      >
        {data.label || "Sem texto"}
      </Typography>
    </Box>
  );
}

function mapContentToFlow(content: FlowchartContent) {
  return {
    nodes: content.nodes.map<ManualFlowNodeType>((node) => ({
      id: node.id,
      type: "manualNode",
      position: node.position,
      data: {
        label: node.data.label,
      },
    })),
    edges: content.edges.map<Edge>((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      markerEnd: {
        type: MarkerType.ArrowClosed,
      },
    })),
  };
}

function serializeFlow(
  nodes: ManualFlowNodeType[],
  edges: Edge[],
  instance: ReactFlowInstance<ManualFlowNodeType, Edge> | null,
): FlowchartContent {
  return {
    nodes: nodes.map((node) => ({
      id: node.id,
      position: node.position,
      data: {
        label: node.data.label,
      },
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
    })),
    viewport: instance?.getViewport() ?? {
      x: 0,
      y: 0,
      zoom: 1,
    },
  };
}
