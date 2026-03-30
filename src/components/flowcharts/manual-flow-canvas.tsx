"use client";

import "@xyflow/react/dist/style.css";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import {
  Background,
  ConnectionMode,
  ConnectionLineType,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  NodeResizer,
  Position,
  ReactFlow,
  ReactFlowProvider,
  SelectionMode,
  reconnectEdge,
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
  AdsClickRounded,
  AltRouteRounded,
  CenterFocusStrongRounded,
  ContentCopyRounded,
  DeleteOutlineRounded,
  FitScreenRounded,
  OpenInFullRounded,
  PanToolAltRounded,
  SaveRounded,
} from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { FlowchartScopeType } from "@prisma/client";
import {
  createFlowchartEdge,
  createFlowchartNode,
  defaultNodeLabel,
  duplicateFlowchartNode,
  flowEdgeAccents,
  flowEdgeLineStyles,
  flowLaneOrientations,
  flowNodeColorKeys,
  flowNodeTypes,
  flowToolLabels,
  getDefaultNodeSize,
  isConnectableNodeType,
  isLaneNodeType,
  type FlowEdgeAccent,
  type FlowEdgeLineStyle,
  type FlowEdgeType,
  type FlowLaneOrientation,
  type FlowNodeColorKey,
  type FlowNodeType,
  type FlowTool,
  type FlowchartContent,
  type FlowchartEdge,
  type FlowchartNode,
  type FlowchartNodeData,
  type FlowchartNodeSize,
} from "@/lib/flowcharts";
import { formatFullDate } from "@/lib/formatters";
import { saveFlowchartAction } from "@/server/actions/flowcharts";
import { FlowCanvasShell } from "@/components/flowcharts/flow-canvas-shell";
import { FlowEdgeRenderer, type FlowEdgeData } from "@/components/flowcharts/flow-edge-renderer";
import { FlowEmptyState } from "@/components/flowcharts/flow-empty-state";
import { FlowInspectorPanel } from "@/components/flowcharts/flow-inspector-panel";
import { FlowNodeCard } from "@/components/flowcharts/flow-node-card";
import { FlowToolbar } from "@/components/flowcharts/flow-toolbar";

type ManualFlowCanvasProps = {
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
  openHref?: string;
  sidebar?: React.ReactNode;
};

type ManualCanvasNode = Node<FlowchartNodeData, "manual">;
type ManualCanvasEdge = Edge<FlowEdgeData, "flow">;
type AlignmentGuide = {
  axis: "x" | "y";
  position: number;
};
type AlignmentMatch = AlignmentGuide & {
  anchor: "start" | "center" | "end";
};

type ManualCanvasContextValue = {
  canManage: boolean;
  activeTool: FlowTool;
  onLaneResize: (nodeId: string, size: FlowchartNodeSize) => void;
  pendingConnectionSourceId: string | null;
  connectionGestureActive: boolean;
};

const ManualCanvasContext = createContext<ManualCanvasContextValue | null>(null);

const nodeTypes = {
  manual: ManualNodeRenderer,
};

const edgeTypes = {
  flow: FlowEdgeRenderer,
};

const artifactGroups = [
  {
    id: "basicos",
    label: "Basicos",
    items: [
      { id: "START_END", shortcut: "S" },
      { id: "PROCESS", shortcut: "P" },
      { id: "DECISION", shortcut: "D" },
      { id: "DOCUMENT", shortcut: "O" },
      { id: "DATA_IO", shortcut: "I" },
    ] as const,
  },
  {
    id: "avancados",
    label: "Avancados",
    items: [
      { id: "MANUAL_OPERATION", shortcut: "M" },
      { id: "SUBPROCESS", shortcut: "B" },
      { id: "CONNECTOR", shortcut: "K" },
      { id: "NOTE", shortcut: "N" },
      { id: "TEXT", shortcut: "T" },
    ] as const,
  },
  {
    id: "estrutura",
    label: "Estrutura",
    items: [{ id: "SWIMLANE", shortcut: "L" }] as const,
  },
] satisfies ReadonlyArray<{
  id: string;
  label: string;
  items: ReadonlyArray<{
    id: FlowNodeType;
    shortcut: string;
  }>;
}>;

const toolGroups = [
  {
    id: "ferramentas",
    label: "Ferramentas",
    items: [
      { id: "select", shortcut: "V" },
      { id: "hand", shortcut: "H" },
      { id: "connect", shortcut: "C" },
    ] as const,
  },
] satisfies ReadonlyArray<{
  id: string;
  label: string;
  items: ReadonlyArray<{
    id: "select" | "hand" | "connect";
    shortcut: string;
  }>;
}>;

const FLOW_CANVAS_SNAP_GRID: [number, number] = [24, 24];
const EDGE_LABEL_PRESETS = ["Sim", "Nao"] as const;
const NODE_ALIGNMENT_THRESHOLD = 12;
const FLOW_HANDLE_IDS = {
  left: "left",
  right: "right",
  top: "top",
  bottom: "bottom",
} as const;
const FLOW_HANDLE_OPTIONS = [
  { id: FLOW_HANDLE_IDS.left, label: "Esquerda" },
  { id: FLOW_HANDLE_IDS.right, label: "Direita" },
  { id: FLOW_HANDLE_IDS.top, label: "Cima" },
  { id: FLOW_HANDLE_IDS.bottom, label: "Baixo" },
] as const;

export function ManualFlowCanvas(props: ManualFlowCanvasProps) {
  return (
    <ReactFlowProvider>
      <ManualFlowCanvasInner {...props} />
    </ReactFlowProvider>
  );
}

function ManualFlowCanvasInner({ flowchart, openHref, sidebar }: ManualFlowCanvasProps) {
  const theme = useTheme();
  const router = useRouter();
  const canvasViewportRef = useRef<HTMLDivElement | null>(null);
  const flowInstanceRef = useRef<ReactFlowInstance<ManualCanvasNode, ManualCanvasEdge> | null>(
    null,
  );
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(
    null,
  );
  const [name, setName] = useState(flowchart.name);
  const [description, setDescription] = useState(flowchart.description ?? "");
  const [activeTool, setActiveTool] = useState<FlowTool>("select");
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [pendingConnectionSourceId, setPendingConnectionSourceId] = useState<string | null>(null);
  const [draftConnectionType, setDraftConnectionType] = useState<FlowEdgeType>("ARROW");
  const [alignmentGuides, setAlignmentGuides] = useState<AlignmentGuide[]>([]);
  const [connectionGestureActive, setConnectionGestureActive] = useState(false);

  const initialGraph = useMemo(() => mapContentToGraph(flowchart.content), [flowchart.content]);
  const [nodes, setNodes, onNodesChange] = useNodesState<ManualCanvasNode>(initialGraph.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<ManualCanvasEdge>(initialGraph.edges);

  useEffect(() => {
    setName(flowchart.name);
    setDescription(flowchart.description ?? "");
    const nextGraph = mapContentToGraph(flowchart.content);
    setNodes(nextGraph.nodes);
    setEdges(nextGraph.edges);
    setSelectedNodeIds([]);
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setPendingConnectionSourceId(null);
    setAlignmentGuides([]);
    setActiveTool("select");
    setMessage(null);
    setConnectionGestureActive(false);
  }, [flowchart, setEdges, setNodes]);

  const selectedNodes = nodes.filter((node) => selectedNodeIds.includes(node.id));
  const selectedNode = selectedNodes.length === 1 ? selectedNodes[0] ?? null : null;
  const selectedEdge = edges.find((edge) => edge.id === selectedEdgeId) ?? null;
  const batchSelectedNodes = selectedNodes.filter((node) => node.data.type !== "SWIMLANE");
  const laneOptions = nodes
    .filter((node) => node.data.type === "SWIMLANE")
    .map((node) => ({
      id: node.id,
      label: node.data.label || "Raia",
    }));

  const syncSelectionState = (nextNodeIds: string[], nextEdgeId: string | null) => {
    const nextSingleNodeId = nextNodeIds.length === 1 ? nextNodeIds[0] ?? null : null;

    setSelectedNodeIds((current) =>
      areStringArraysEqual(current, nextNodeIds) ? current : nextNodeIds,
    );
    setSelectedNodeId((current) => (current === nextSingleNodeId ? current : nextSingleNodeId));
    setSelectedEdgeId((current) => (current === nextEdgeId ? current : nextEdgeId));
  };

  const handleInit: OnInit<ManualCanvasNode, ManualCanvasEdge> = (instance) => {
    flowInstanceRef.current = instance;

    if (flowchart.content.viewport) {
      void instance.setViewport(flowchart.content.viewport, { duration: 0 });
      return;
    }

    if (flowchart.content.nodes.length) {
      void instance.fitView({
        padding: 0.16,
        duration: 0,
      });
    }
  };

  const handlePaneClick = (event: React.MouseEvent) => {
    if (activeTool === "connect" && pendingConnectionSourceId) {
      setPendingConnectionSourceId(null);
      setSelectedNodeIds([]);
      setSelectedNodeId(null);
      setAlignmentGuides([]);
      return;
    }

    if (!flowchart.canManage || !isCreateTool(activeTool)) {
      setSelectedNodeIds([]);
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
      setAlignmentGuides([]);
      return;
    }

    const instance = flowInstanceRef.current;

    if (!instance) {
      return;
    }

    const position = snapCanvasPosition(
      instance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      }),
    );

    const nextNode = createFlowchartNode({
      type: activeTool,
      position,
      label: defaultNodeLabel(activeTool),
      orientation: activeTool === "SWIMLANE" ? "VERTICAL" : undefined,
    });

    setNodes((currentNodes) => withNodeOrder([...currentNodes, toCanvasNode(nextNode)]));
    setSelectedNodeIds([nextNode.id]);
    setSelectedNodeId(nextNode.id);
    setSelectedEdgeId(null);
    setAlignmentGuides([]);
    setActiveTool("select");
  };

  const handleCreateEdge = (input: {
    source: string;
    target: string;
    sourceHandle?: string | null;
    targetHandle?: string | null;
  }) => {
    const resolvedHandles = resolveEdgeHandles({
      sourceHandle: input.sourceHandle,
      targetHandle: input.targetHandle,
      sourceNode: nodes.find((node) => node.id === input.source) ?? null,
      targetNode: nodes.find((node) => node.id === input.target) ?? null,
    });

    const nextEdge = createFlowchartEdge({
      source: input.source,
      target: input.target,
      sourceHandle: resolvedHandles.sourceHandle,
      targetHandle: resolvedHandles.targetHandle,
      type: draftConnectionType,
    });

    setEdges((currentEdges) => [...currentEdges, toCanvasEdge(nextEdge)]);
    setSelectedNodeIds([]);
    setSelectedEdgeId(nextEdge.id);
    setSelectedNodeId(null);
    setPendingConnectionSourceId(null);
    setAlignmentGuides([]);
  };

  const handleConnect = (connection: Connection) => {
    if (!flowchart.canManage || !connection.source || !connection.target) {
      return;
    }

    handleCreateEdge({
      source: connection.source,
      target: connection.target,
      sourceHandle: connection.sourceHandle,
      targetHandle: connection.targetHandle,
    });
  };

  const handleReconnect = (oldEdge: ManualCanvasEdge, connection: Connection) => {
    if (!flowchart.canManage || !connection.source || !connection.target) {
      return;
    }

    const normalizedSourceHandle =
      normalizeFlowHandleId(connection.sourceHandle) ??
      normalizeFlowHandleId(oldEdge.sourceHandle) ??
      FLOW_HANDLE_IDS.right;
    const normalizedTargetHandle =
      normalizeFlowHandleId(connection.targetHandle) ??
      normalizeFlowHandleId(oldEdge.targetHandle) ??
      FLOW_HANDLE_IDS.left;

    setEdges((currentEdges) =>
      reconnectEdge(
        oldEdge,
        {
          ...connection,
          sourceHandle: normalizedSourceHandle,
          targetHandle: normalizedTargetHandle,
        },
        currentEdges,
        { shouldReplaceId: false },
      ).map((edge) =>
        edge.id === oldEdge.id
          ? {
              ...edge,
              sourceHandle: normalizedSourceHandle,
              targetHandle: normalizedTargetHandle,
            }
          : edge,
      ),
    );
    setSelectedEdgeId(oldEdge.id);
    setSelectedNodeIds([]);
    setSelectedNodeId(null);
  };

  const handleNodeClick = (_event: React.MouseEvent, node: ManualCanvasNode) => {
    if (activeTool !== "connect" || !flowchart.canManage || !isConnectableNodeType(node.data.type)) {
      return;
    }

    if (!pendingConnectionSourceId) {
      setPendingConnectionSourceId(node.id);
      setSelectedNodeIds([node.id]);
      setSelectedNodeId(node.id);
      setSelectedEdgeId(null);
      setAlignmentGuides([]);
      return;
    }

    if (pendingConnectionSourceId === node.id) {
      setPendingConnectionSourceId(null);
      setSelectedNodeIds([]);
      setSelectedNodeId(null);
      setAlignmentGuides([]);
      return;
    }

    handleCreateEdge({
      source: pendingConnectionSourceId,
      target: node.id,
    });
  };

  const handleDeleteSelection = () => {
    if (!flowchart.canManage) {
      return;
    }

    if (selectedNodeIds.length) {
      const selectedNodeIdSet = new Set(selectedNodeIds);

      setNodes((currentNodes) =>
        currentNodes.filter((node) => !selectedNodeIdSet.has(node.id)),
      );
      setEdges((currentEdges) =>
        currentEdges.filter(
          (edge) =>
            !selectedNodeIdSet.has(edge.source) && !selectedNodeIdSet.has(edge.target),
        ),
      );
      setSelectedNodeIds([]);
      setSelectedNodeId(null);
      setAlignmentGuides([]);
      return;
    }

    if (selectedEdgeId) {
      setEdges((currentEdges) => currentEdges.filter((edge) => edge.id !== selectedEdgeId));
      setSelectedEdgeId(null);
    }

    setPendingConnectionSourceId(null);
    setAlignmentGuides([]);
  };

  const handleDuplicateSelection = () => {
    if (!flowchart.canManage || !selectedNodes.length) {
      return;
    }

    const duplicatedNodes = selectedNodes.map((selectedNode) =>
      duplicateFlowchartNode({
        id: selectedNode.id,
        position: selectedNode.position,
        data: selectedNode.data,
      }),
    );

    setNodes((currentNodes) =>
      withNodeOrder([...currentNodes, ...duplicatedNodes.map((node) => toCanvasNode(node))]),
    );
    setSelectedNodeIds(duplicatedNodes.map((node) => node.id));
    setSelectedNodeId(duplicatedNodes.length === 1 ? duplicatedNodes[0]?.id ?? null : null);
    setSelectedEdgeId(null);
  };

  const handleAlignSelection = (
    alignment: "left" | "center" | "right" | "top" | "middle" | "bottom",
  ) => {
    if (!flowchart.canManage || batchSelectedNodes.length < 2) {
      return;
    }

    const bounds = getSelectionBounds(batchSelectedNodes);

    setNodes((currentNodes) =>
      withNodeOrder(
        currentNodes.map((node) => {
          if (!selectedNodeIds.includes(node.id) || node.data.type === "SWIMLANE") {
            return node;
          }

          const nextPosition =
            alignment === "left"
              ? { ...node.position, x: bounds.left }
              : alignment === "center"
                ? { ...node.position, x: bounds.centerX - node.data.size.width / 2 }
                : alignment === "right"
                  ? { ...node.position, x: bounds.right - node.data.size.width }
                  : alignment === "top"
                    ? { ...node.position, y: bounds.top }
                    : alignment === "middle"
                      ? { ...node.position, y: bounds.centerY - node.data.size.height / 2 }
                      : { ...node.position, y: bounds.bottom - node.data.size.height };

          return {
            ...node,
            position: snapCanvasPosition(nextPosition),
          };
        }),
      ),
    );
    setAlignmentGuides([]);
  };

  const handleDistributeSelection = (direction: "horizontal" | "vertical") => {
    if (!flowchart.canManage || batchSelectedNodes.length < 3) {
      return;
    }

    const sortedNodes = [...batchSelectedNodes].sort((left, right) =>
      direction === "horizontal"
        ? left.position.x + left.data.size.width / 2 - (right.position.x + right.data.size.width / 2)
        : left.position.y + left.data.size.height / 2 - (right.position.y + right.data.size.height / 2),
    );

    const firstNode = sortedNodes[0];
    const lastNode = sortedNodes[sortedNodes.length - 1];

    if (!firstNode || !lastNode) {
      return;
    }

    const firstCenter =
      direction === "horizontal"
        ? firstNode.position.x + firstNode.data.size.width / 2
        : firstNode.position.y + firstNode.data.size.height / 2;
    const lastCenter =
      direction === "horizontal"
        ? lastNode.position.x + lastNode.data.size.width / 2
        : lastNode.position.y + lastNode.data.size.height / 2;
    const step = (lastCenter - firstCenter) / (sortedNodes.length - 1);
    const nextPositions = new Map<string, { x: number; y: number }>();

    sortedNodes.forEach((node, index) => {
      if (index === 0 || index === sortedNodes.length - 1) {
        nextPositions.set(node.id, node.position);
        return;
      }

      const targetCenter = firstCenter + step * index;
      const nextPosition =
        direction === "horizontal"
          ? {
              x: targetCenter - node.data.size.width / 2,
              y: node.position.y,
            }
          : {
              x: node.position.x,
              y: targetCenter - node.data.size.height / 2,
            };

      nextPositions.set(node.id, snapCanvasPosition(nextPosition));
    });

    setNodes((currentNodes) =>
      withNodeOrder(
        currentNodes.map((node) =>
          nextPositions.has(node.id)
            ? {
                ...node,
                position: nextPositions.get(node.id) ?? node.position,
              }
            : node,
        ),
      ),
    );
    setAlignmentGuides([]);
  };

  const handleFitView = () => {
    const instance = flowInstanceRef.current;

    if (!instance) {
      return;
    }

    void instance.fitView({
      padding: 0.16,
      duration: 220,
    });
  };

  const handleNodeUpdate = (partial: Partial<FlowchartNodeData>) => {
    if (!selectedNodeId) {
      return;
    }

    setNodes((currentNodes) =>
      withNodeOrder(
        currentNodes.map((node) =>
          node.id === selectedNodeId
            ? (() => {
                const nextType = partial.type ?? node.data.type;

                return {
                  ...node,
                  zIndex: isLaneNodeType(nextType) ? 0 : 10,
                  data: {
                    ...node.data,
                    ...partial,
                    size: partial.size
                      ? {
                          width: partial.size.width,
                          height: partial.size.height,
                        }
                      : node.data.size,
                  },
                };
              })()
            : node,
        ),
      ),
    );
  };

  const handleNodeTypeChange = (nextType: FlowNodeType) => {
    if (!selectedNode) {
      return;
    }

    const nextOrientation =
      nextType === "SWIMLANE" ? selectedNode.data.orientation ?? "VERTICAL" : undefined;

    handleNodeUpdate({
      type: nextType,
      orientation: nextOrientation,
      size: getDefaultNodeSize(nextType, nextOrientation ?? "VERTICAL"),
    });
  };

  const handleNodeSizeUpdate = (partial: Partial<FlowchartNodeSize>) => {
    if (!selectedNode) {
      return;
    }

    handleNodeUpdate({
      size: {
        width: partial.width ?? selectedNode.data.size.width,
        height: partial.height ?? selectedNode.data.size.height,
      },
    });
  };

  const handleLaneResize = (nodeId: string, size: FlowchartNodeSize) => {
    setNodes((currentNodes) =>
      currentNodes.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              data: {
                ...node.data,
                size,
              },
            }
          : node,
      ),
    );
  };

  const handleEdgeUpdate = (partial: Partial<FlowEdgeData>) => {
    if (!selectedEdgeId) {
      return;
    }

    setEdges((currentEdges) =>
      currentEdges.map((edge) =>
        edge.id === selectedEdgeId
          ? (() => {
              const nextAccent = partial.accent ?? edge.data?.accent ?? "violet";

              return {
                ...edge,
                markerEnd: {
                  type: MarkerType.ArrowClosed,
                  width: 22,
                  height: 22,
                  color:
                    nextAccent === "gold"
                      ? "#FFBB00"
                      : nextAccent === "neutral"
                        ? "#8C839F"
                        : "#5D05FF",
                },
                data: {
                  ...edge.data,
                  ...partial,
                },
              };
            })()
          : edge,
      ),
    );
  };

  const handleEdgeHandleUpdate = (partial: {
    sourceHandle?: string;
    targetHandle?: string;
  }) => {
    if (!selectedEdgeId) {
      return;
    }

    setEdges((currentEdges) =>
      currentEdges.map((edge) =>
        edge.id === selectedEdgeId
          ? {
              ...edge,
              sourceHandle: partial.sourceHandle ?? edge.sourceHandle ?? FLOW_HANDLE_IDS.right,
              targetHandle: partial.targetHandle ?? edge.targetHandle ?? FLOW_HANDLE_IDS.left,
            }
          : edge,
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
        content: serializeGraph(nodes, edges, flowInstanceRef.current),
      });

      if (!result.ok) {
        setMessage({ type: "error", text: result.error });
        return;
      }

      setMessage({ type: "success", text: "Diagrama salvo." });
      router.refresh();
    });
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const editable =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;

      if (editable) {
        return;
      }

      if ((event.key === "Backspace" || event.key === "Delete") && flowchart.canManage) {
        event.preventDefault();
        handleDeleteSelection();
        return;
      }

      if (event.key === "Escape") {
        setPendingConnectionSourceId(null);
        setSelectedNodeIds([]);
        setSelectedNodeId(null);
        setSelectedEdgeId(null);
        setAlignmentGuides([]);
        setConnectionGestureActive(false);
        setActiveTool("select");
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "d") {
        event.preventDefault();
        handleDuplicateSelection();
        return;
      }

      const key = event.key.toLowerCase();

      if (key === "v") {
        setActiveTool("select");
      } else if (key === "h") {
        setActiveTool("hand");
      } else if (key === "c") {
        setActiveTool("connect");
      } else if (key === "s" && flowchart.canManage) {
        setActiveTool("START_END");
      } else if (key === "p" && flowchart.canManage) {
        setActiveTool("PROCESS");
      } else if (key === "d" && flowchart.canManage) {
        setActiveTool("DECISION");
      } else if (key === "o" && flowchart.canManage) {
        setActiveTool("DOCUMENT");
      } else if (key === "i" && flowchart.canManage) {
        setActiveTool("DATA_IO");
      } else if (key === "m" && flowchart.canManage) {
        setActiveTool("MANUAL_OPERATION");
      } else if (key === "b" && flowchart.canManage) {
        setActiveTool("SUBPROCESS");
      } else if (key === "k" && flowchart.canManage) {
        setActiveTool("CONNECTOR");
      } else if (key === "l" && flowchart.canManage) {
        setActiveTool("SWIMLANE");
      } else if (key === "n" && flowchart.canManage) {
        setActiveTool("NOTE");
      } else if (key === "t" && flowchart.canManage) {
        setActiveTool("TEXT");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [flowchart.canManage, selectedEdgeId, selectedNode, selectedNodeId, selectedNodes]);

  const handleNodeDrag = (_event: React.MouseEvent, node: ManualCanvasNode) => {
    if (!flowchart.canManage || node.data.type === "SWIMLANE") {
      setAlignmentGuides([]);
      return;
    }

    const magneticAlignment = getMagneticAlignment(node, nodes);

    setAlignmentGuides(magneticAlignment.guides);

    if (
      magneticAlignment.position.x !== node.position.x ||
      magneticAlignment.position.y !== node.position.y
    ) {
      setNodes((currentNodes) =>
        currentNodes.map((currentNode) =>
          currentNode.id === node.id
            ? {
                ...currentNode,
                position: magneticAlignment.position,
              }
            : currentNode,
        ),
      );
    }
  };

  const handleNodeDragStop = (_event: React.MouseEvent, node: ManualCanvasNode) => {
    if (flowchart.canManage && node.data.type !== "SWIMLANE") {
      const magneticAlignment = getMagneticAlignment(node, nodes);

      if (
        magneticAlignment.position.x !== node.position.x ||
        magneticAlignment.position.y !== node.position.y
      ) {
        setNodes((currentNodes) =>
          currentNodes.map((currentNode) =>
            currentNode.id === node.id
              ? {
                  ...currentNode,
                  position: magneticAlignment.position,
                }
              : currentNode,
          ),
        );
      }
    }

    setAlignmentGuides([]);
  };

  const toolbar = (
    <FlowToolbar
      groups={[
        {
          id: "tools",
          label: "Ferramentas",
          items: toolGroups[0].items.map((tool) => ({
            id: tool.id,
            label: flowToolLabels[tool.id],
            icon: <FlowToolIcon tool={tool.id} />,
            shortcut: tool.shortcut,
            active: activeTool === tool.id,
            onClick: () => {
              if (tool.id === "connect" && activeTool === "connect") {
                setPendingConnectionSourceId(null);
                setActiveTool("select");
                return;
              }

              setPendingConnectionSourceId(null);
              setActiveTool(tool.id);
            },
          })),
        },
        ...artifactGroups.map((group) => ({
          id: group.id,
          label: group.label,
          items: group.items.map((artifact) => ({
            id: artifact.id,
            label: flowToolLabels[artifact.id],
            icon: <ArtifactIcon type={artifact.id} />,
            shortcut: artifact.shortcut,
            active: activeTool === artifact.id,
            disabled: !flowchart.canManage,
            onClick: () => {
              setPendingConnectionSourceId(null);
              setActiveTool(artifact.id);
            },
          })),
        })),
      ]}
    />
  );

  const headerActions = (
    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
      {selectedNodes.length && flowchart.canManage ? (
        <IconButton onClick={handleDuplicateSelection}>
          <ContentCopyRounded />
        </IconButton>
      ) : null}
      {(selectedNodes.length || selectedEdge) && flowchart.canManage ? (
        <IconButton onClick={handleDeleteSelection}>
          <DeleteOutlineRounded />
        </IconButton>
      ) : null}
      {activeTool === "connect" ? (
        <Button
          onClick={() => {
            setPendingConnectionSourceId(null);
            setActiveTool("select");
          }}
          variant="outlined"
          color="secondary"
        >
          Cancelar conexao
        </Button>
      ) : null}
      <Button onClick={handleFitView} variant="outlined" startIcon={<FitScreenRounded />}>
        Ajustar visao
      </Button>
      {openHref ? (
        <Button
          component="a"
          href={openHref}
          variant="outlined"
          startIcon={<OpenInFullRounded />}
        >
          Tela grande
        </Button>
      ) : null}
      {flowchart.canManage ? (
        <Button
          onClick={handleSave}
          variant="contained"
          startIcon={<SaveRounded />}
          disabled={isPending}
        >
          {isPending ? "Salvando..." : "Salvar"}
        </Button>
      ) : null}
    </Stack>
  );

  const inspector = (
    <FlowInspectorPanel
      eyebrow="Editor"
      title={
        selectedNodes.length > 1
          ? "Selecao multipla"
          : selectedNode
          ? selectedNode.data.type === "SWIMLANE"
            ? "Raia selecionada"
            : "Artefato selecionado"
          : selectedEdge
            ? "Ligacao selecionada"
            : flowchart.scopeType === FlowchartScopeType.TASK
              ? "Fluxo da tarefa"
              : flowchart.scopeType === FlowchartScopeType.PROJECT
                ? "Fluxo do projeto"
                : "Fluxo do workspace"
      }
      description={
        selectedNodes.length > 1
          ? "Alinhe e distribua os artefatos selecionados para limpar o fluxo sem reposicionar um por um."
          : selectedNode
          ? selectedNode.data.type === "SWIMLANE"
            ? "Ajuste nome, orientacao e tamanho da raia para organizar responsabilidades no fluxo."
            : "Edite o texto, o simbolo e a cor do artefato sem sair do canvas."
          : selectedEdge
            ? "Refine o rotulo e o estilo da ligacao para deixar o fluxo mais legivel."
            : activeTool === "connect"
              ? pendingConnectionSourceId
                ? "Modo conectar ativo: selecione o artefato de destino para concluir a ligacao."
                : "Modo conectar ativo: selecione o artefato de origem e depois o de destino."
              : "Paleta por artefatos classicos, ligacoes com rotulo e raias para documentacao real do TCC."
      }
    >
      {selectedNodes.length > 1 ? (
        <Stack spacing={1.5}>
          <Typography color="text.secondary" variant="body2">
            {selectedNodes.length} artefatos selecionados.
          </Typography>
          {batchSelectedNodes.length !== selectedNodes.length ? (
            <Typography color="text.secondary" variant="caption">
              Raias permanecem fora do alinhamento em lote para preservar a estrutura do canvas.
            </Typography>
          ) : null}
          <Stack spacing={0.85}>
            <Typography fontWeight={700} variant="body2">
              Alinhar
            </Typography>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              <Button
                size="small"
                variant="outlined"
                onClick={() => handleAlignSelection("left")}
                disabled={!flowchart.canManage || batchSelectedNodes.length < 2}
              >
                Esquerda
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() => handleAlignSelection("center")}
                disabled={!flowchart.canManage || batchSelectedNodes.length < 2}
              >
                Centro X
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() => handleAlignSelection("right")}
                disabled={!flowchart.canManage || batchSelectedNodes.length < 2}
              >
                Direita
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() => handleAlignSelection("top")}
                disabled={!flowchart.canManage || batchSelectedNodes.length < 2}
              >
                Topo
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() => handleAlignSelection("middle")}
                disabled={!flowchart.canManage || batchSelectedNodes.length < 2}
              >
                Centro Y
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() => handleAlignSelection("bottom")}
                disabled={!flowchart.canManage || batchSelectedNodes.length < 2}
              >
                Base
              </Button>
            </Stack>
          </Stack>
          <Stack spacing={0.85}>
            <Typography fontWeight={700} variant="body2">
              Distribuir
            </Typography>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              <Button
                size="small"
                variant="outlined"
                onClick={() => handleDistributeSelection("horizontal")}
                disabled={!flowchart.canManage || batchSelectedNodes.length < 3}
              >
                Horizontal
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() => handleDistributeSelection("vertical")}
                disabled={!flowchart.canManage || batchSelectedNodes.length < 3}
              >
                Vertical
              </Button>
            </Stack>
          </Stack>
          <Stack direction="row" spacing={1}>
            <Button
              onClick={handleDuplicateSelection}
              variant="outlined"
              startIcon={<ContentCopyRounded />}
              disabled={!flowchart.canManage}
            >
              Duplicar selecao
            </Button>
            <Button
              onClick={handleDeleteSelection}
              variant="outlined"
              color="error"
              startIcon={<DeleteOutlineRounded />}
              disabled={!flowchart.canManage}
            >
              Excluir selecao
            </Button>
          </Stack>
        </Stack>
      ) : selectedNode ? (
        <Stack spacing={1.5}>
          <TextField
            label={selectedNode.data.type === "SWIMLANE" ? "Nome da raia" : "Texto"}
            multiline={selectedNode.data.type !== "CONNECTOR"}
            minRows={selectedNode.data.type !== "CONNECTOR" ? 2 : undefined}
            value={selectedNode.data.label}
            disabled={!flowchart.canManage}
            onChange={(event) => handleNodeUpdate({ label: event.target.value })}
          />
          <TextField
            select
            label="Artefato"
            value={selectedNode.data.type}
            disabled={!flowchart.canManage}
            onChange={(event) => handleNodeTypeChange(event.target.value as FlowNodeType)}
          >
            {artifactGroups.map((group) => [
              <MenuItem key={group.id} value="" disabled sx={{ opacity: 1 }}>
                {group.label}
              </MenuItem>,
              ...group.items.map((artifact) => (
                <MenuItem key={artifact.id} value={artifact.id}>
                  {flowToolLabels[artifact.id]}
                </MenuItem>
              )),
            ])}
          </TextField>

          {selectedNode.data.type === "SWIMLANE" ? (
            <>
              <TextField
                select
                label="Orientacao"
                value={selectedNode.data.orientation ?? "VERTICAL"}
                disabled={!flowchart.canManage}
                onChange={(event) => {
                  const orientation = event.target.value as FlowLaneOrientation;
                  handleNodeUpdate({
                    orientation,
                    size: getDefaultNodeSize("SWIMLANE", orientation),
                  });
                }}
              >
                {flowLaneOrientations.map((orientation) => (
                  <MenuItem key={orientation} value={orientation}>
                    {orientation === "VERTICAL" ? "Vertical" : "Horizontal"}
                  </MenuItem>
                ))}
              </TextField>
              <Stack direction="row" spacing={1.25}>
                <TextField
                  fullWidth
                  label="Largura"
                  type="number"
                  value={selectedNode.data.size.width}
                  disabled={!flowchart.canManage}
                  onChange={(event) =>
                    handleNodeSizeUpdate({
                      width: Math.max(Number(event.target.value) || 0, 220),
                    })
                  }
                />
                <TextField
                  fullWidth
                  label="Altura"
                  type="number"
                  value={selectedNode.data.size.height}
                  disabled={!flowchart.canManage}
                  onChange={(event) =>
                    handleNodeSizeUpdate({
                      height: Math.max(Number(event.target.value) || 0, 180),
                    })
                  }
                />
              </Stack>
            </>
          ) : null}

          <Stack spacing={0.75}>
            <Typography fontWeight={700} variant="body2">
              Cor
            </Typography>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              {flowNodeColorKeys.map((color) => (
                <ColorSwatch
                  key={color}
                  color={color}
                  selected={selectedNode.data.color === color}
                  onClick={() => handleNodeUpdate({ color })}
                />
              ))}
            </Stack>
          </Stack>

          <Stack direction="row" spacing={1}>
            <Button
              onClick={handleDuplicateSelection}
              variant="outlined"
              startIcon={<ContentCopyRounded />}
              disabled={!flowchart.canManage}
            >
              Duplicar
            </Button>
            <Button
              onClick={handleDeleteSelection}
              variant="outlined"
              color="error"
              startIcon={<DeleteOutlineRounded />}
              disabled={!flowchart.canManage}
            >
              Excluir
            </Button>
          </Stack>
        </Stack>
      ) : selectedEdge ? (
        <Stack spacing={1.5}>
          <TextField
            label="Rotulo da ligacao"
            value={selectedEdge.data?.label ?? ""}
            disabled={!flowchart.canManage}
            onChange={(event) => handleEdgeUpdate({ label: event.target.value })}
            placeholder="Ex.: Sim / Nao"
          />
          {flowchart.canManage ? (
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              {EDGE_LABEL_PRESETS.map((preset) => (
                <Button
                  key={preset}
                  variant={selectedEdge.data?.label === preset ? "contained" : "outlined"}
                  color={selectedEdge.data?.label === preset ? "secondary" : "inherit"}
                  size="small"
                  onClick={() => handleEdgeUpdate({ label: preset })}
                >
                  {preset}
                </Button>
              ))}
              <Button
                variant="text"
                size="small"
                color="inherit"
                onClick={() => handleEdgeUpdate({ label: "" })}
              >
                Limpar
              </Button>
            </Stack>
          ) : null}
          <Stack direction="row" spacing={1.25}>
            <TextField
              fullWidth
              select
              label="Saida"
              value={normalizeFlowHandleId(selectedEdge.sourceHandle) ?? FLOW_HANDLE_IDS.right}
              disabled={!flowchart.canManage}
              onChange={(event) =>
                handleEdgeHandleUpdate({ sourceHandle: event.target.value })
              }
            >
              {FLOW_HANDLE_OPTIONS.map((handle) => (
                <MenuItem key={handle.id} value={handle.id}>
                  {handle.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              fullWidth
              select
              label="Entrada"
              value={normalizeFlowHandleId(selectedEdge.targetHandle) ?? FLOW_HANDLE_IDS.left}
              disabled={!flowchart.canManage}
              onChange={(event) =>
                handleEdgeHandleUpdate({ targetHandle: event.target.value })
              }
            >
              {FLOW_HANDLE_OPTIONS.map((handle) => (
                <MenuItem key={handle.id} value={handle.id}>
                  {handle.label}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
          <TextField
            select
            label="Tipo de ligacao"
            value={selectedEdge.data?.connectionType ?? "ARROW"}
            disabled={!flowchart.canManage}
            onChange={(event) =>
              handleEdgeUpdate({ connectionType: event.target.value as FlowEdgeType })
            }
          >
            <MenuItem value="LINE">Linha simples</MenuItem>
            <MenuItem value="ARROW">Seta unidirecional</MenuItem>
            <MenuItem value="BIDIRECTIONAL">Seta bidirecional</MenuItem>
          </TextField>
          <TextField
            select
            label="Cor"
            value={selectedEdge.data?.accent ?? "violet"}
            disabled={!flowchart.canManage}
            onChange={(event) =>
              handleEdgeUpdate({ accent: event.target.value as FlowEdgeAccent })
            }
          >
            {flowEdgeAccents.map((accent) => (
              <MenuItem key={accent} value={accent}>
                {accent === "gold" ? "Gold" : accent === "violet" ? "Violet" : "Neutra"}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Estilo"
            value={selectedEdge.data?.lineStyle ?? "solid"}
            disabled={!flowchart.canManage}
            onChange={(event) =>
              handleEdgeUpdate({ lineStyle: event.target.value as FlowEdgeLineStyle })
            }
          >
            {flowEdgeLineStyles.map((lineStyle) => (
              <MenuItem key={lineStyle} value={lineStyle}>
                {lineStyle === "solid" ? "Solida" : "Tracejada"}
              </MenuItem>
            ))}
          </TextField>
          <Typography color="text.secondary" variant="body2">
            Ligacao entre <strong>{selectedEdge.source}</strong> e{" "}
            <strong>{selectedEdge.target}</strong>.
          </Typography>
          {flowchart.canManage ? (
            <Button
              onClick={handleDeleteSelection}
              variant="outlined"
              color="error"
              startIcon={<DeleteOutlineRounded />}
            >
              Remover ligacao
            </Button>
          ) : null}
        </Stack>
      ) : (
        <Stack spacing={1}>
          <Typography color="text.secondary" variant="body2">
            {flowchart.canManage
              ? "Atalhos: V selecionar, H mover visao, C conectar, S/P/D/O/I/M/B/K/L/N/T para inserir artefatos."
              : "Modo de leitura ativo para este diagrama."}
          </Typography>
          {flowchart.canManage ? (
            <TextField
              select
              label="Novo tipo de ligacao"
              value={draftConnectionType}
              onChange={(event) => setDraftConnectionType(event.target.value as FlowEdgeType)}
            >
              <MenuItem value="LINE">Linha simples</MenuItem>
              <MenuItem value="ARROW">Seta unidirecional</MenuItem>
              <MenuItem value="BIDIRECTIONAL">Seta bidirecional</MenuItem>
            </TextField>
          ) : null}
          {activeTool === "connect" ? (
            <Typography color="text.secondary" variant="caption">
              {pendingConnectionSourceId
                ? "Origem marcada. Clique no segundo artefato ou pressione Esc para cancelar."
                : "Clique na origem e depois no destino. Handles continuam disponiveis para drag."}
            </Typography>
          ) : null}
          <Typography color="text.secondary" variant="caption">
            Atualizado em {formatFullDate(flowchart.updatedAt)}.
          </Typography>
          <Typography color="text.secondary" variant="caption">
            {laneOptions.length
              ? `${laneOptions.length} raia(s) para separar responsabilidades`
              : "Adicione raias para organizar frontend, backend, IA, documentacao e outras frentes."}
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
      )}
    </FlowInspectorPanel>
  );

  const batchSelectionMenu =
    flowchart.canManage && selectedNodes.length > 1
      ? (() => {
          const style = getSelectionMenuStyle({
            instance: flowInstanceRef.current,
            container: canvasViewportRef.current,
            bounds: getSelectionBounds(selectedNodes),
          });

          if (!style) {
            return null;
          }

          return (
            <Box
              sx={{
                position: "absolute",
                zIndex: 9,
                ...style,
              }}
            >
              <Box
                sx={{
                  p: 0.9,
                  borderRadius: 4,
                  border: "1px solid",
                  borderColor: alpha(theme.palette.secondary.main, 0.2),
                  bgcolor: alpha(theme.palette.background.paper, 0.92),
                  backdropFilter: "blur(16px)",
                  boxShadow: "0 18px 42px rgba(7, 6, 12, 0.18)",
                }}
              >
                <Stack spacing={0.7}>
                  <Stack direction="row" spacing={0.7} useFlexGap flexWrap="wrap">
                    <MiniMenuButton
                      label="Esquerda"
                      onClick={() => handleAlignSelection("left")}
                      disabled={batchSelectedNodes.length < 2}
                    />
                    <MiniMenuButton
                      label="Centro X"
                      onClick={() => handleAlignSelection("center")}
                      disabled={batchSelectedNodes.length < 2}
                    />
                    <MiniMenuButton
                      label="Direita"
                      onClick={() => handleAlignSelection("right")}
                      disabled={batchSelectedNodes.length < 2}
                    />
                    <MiniMenuButton
                      label="Topo"
                      onClick={() => handleAlignSelection("top")}
                      disabled={batchSelectedNodes.length < 2}
                    />
                    <MiniMenuButton
                      label="Centro Y"
                      onClick={() => handleAlignSelection("middle")}
                      disabled={batchSelectedNodes.length < 2}
                    />
                    <MiniMenuButton
                      label="Base"
                      onClick={() => handleAlignSelection("bottom")}
                      disabled={batchSelectedNodes.length < 2}
                    />
                  </Stack>
                  <Stack direction="row" spacing={0.7} useFlexGap flexWrap="wrap">
                    <MiniMenuButton
                      label="Dist. H"
                      onClick={() => handleDistributeSelection("horizontal")}
                      disabled={batchSelectedNodes.length < 3}
                    />
                    <MiniMenuButton
                      label="Dist. V"
                      onClick={() => handleDistributeSelection("vertical")}
                      disabled={batchSelectedNodes.length < 3}
                    />
                    <MiniMenuButton
                      label="Duplicar"
                      onClick={handleDuplicateSelection}
                    />
                    <MiniMenuButton
                      label="Excluir"
                      onClick={handleDeleteSelection}
                      tone="danger"
                    />
                  </Stack>
                </Stack>
              </Box>
            </Box>
          );
        })()
      : null;

  const canvas = (
    <Box
      ref={canvasViewportRef}
      sx={{
        height: 760,
        background:
          "radial-gradient(circle at top, rgba(93, 5, 255, 0.06), transparent 24%), radial-gradient(circle at bottom right, rgba(255, 187, 0, 0.08), transparent 20%)",
      }}
    >
      <ManualCanvasContext.Provider
        value={{
          canManage: flowchart.canManage,
          activeTool,
          onLaneResize: handleLaneResize,
          pendingConnectionSourceId,
          connectionGestureActive,
        }}
      >
        <ReactFlow<ManualCanvasNode, ManualCanvasEdge>
          nodes={withNodeOrder(nodes)}
          edges={withRenderedEdgeData(edges)}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          connectionMode={ConnectionMode.Loose}
          onInit={handleInit}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={handleConnect}
          onConnectStart={() => setConnectionGestureActive(true)}
          onConnectEnd={() => setConnectionGestureActive(false)}
          onReconnect={handleReconnect}
          onReconnectStart={() => setConnectionGestureActive(true)}
          onReconnectEnd={() => setConnectionGestureActive(false)}
          onNodeClick={handleNodeClick}
          onNodeDrag={handleNodeDrag}
          onNodeDragStop={handleNodeDragStop}
          onPaneClick={handlePaneClick}
          onSelectionChange={({ nodes: nextNodes, edges: nextEdges }) => {
            syncSelectionState(
              nextNodes.map((node) => node.id),
              nextNodes.length === 0 && nextEdges.length === 1 ? nextEdges[0]?.id ?? null : null,
            );
          }}
          connectionLineType={ConnectionLineType.SmoothStep}
          connectionLineStyle={{
            stroke: "#5D05FF",
            strokeWidth: 2.4,
          }}
          panOnScroll
          panOnDrag={activeTool === "hand"}
          selectionOnDrag={activeTool === "select"}
          selectionMode={SelectionMode.Partial}
          nodesDraggable={flowchart.canManage && activeTool === "select"}
          nodesConnectable={flowchart.canManage && activeTool !== "hand"}
          edgesReconnectable={flowchart.canManage && activeTool !== "hand"}
          reconnectRadius={20}
          elementsSelectable={activeTool !== "hand"}
          snapToGrid={flowchart.canManage}
          snapGrid={FLOW_CANVAS_SNAP_GRID}
          proOptions={{ hideAttribution: true }}
          minZoom={0.28}
          maxZoom={1.9}
          fitViewOptions={{ padding: 0.16 }}
        >
          <Background gap={22} size={1} color={alpha(theme.palette.text.secondary, 0.08)} />
          <MiniMap
            pannable
            zoomable
            nodeBorderRadius={18}
            nodeColor={(node) =>
              node.data.color === "gold"
                ? alpha("#FFBB00", 0.55)
                : node.data.color === "violet"
                  ? alpha("#5D05FF", 0.55)
                  : node.data.color === "mint"
                    ? alpha("#18B56A", 0.55)
                    : node.data.color === "rose"
                      ? alpha("#F45EA4", 0.55)
                      : alpha(theme.palette.text.secondary, 0.32)
            }
            maskColor={alpha(theme.palette.background.default, 0.72)}
          />
          <Controls showInteractive={false} />
        </ReactFlow>
      </ManualCanvasContext.Provider>

      {!nodes.length ? (
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            pointerEvents: "none",
            p: 3,
          }}
        >
          <Box sx={{ width: "min(560px, 100%)", pointerEvents: "none" }}>
            <FlowEmptyState
              title="Monte o fluxograma"
              message={
                flowchart.canManage
                  ? "Use a paleta para inserir processos, decisoes, documentos, conectores e raias, depois ligue os elementos com setas e rotulos."
                  : "Este fluxograma ainda nao tem artefatos visiveis."
              }
            />
          </Box>
        </Box>
      ) : null}

      {batchSelectionMenu}

      {alignmentGuides.length ? (
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            zIndex: 7,
          }}
        >
          {alignmentGuides.map((guide) => {
            const style = getAlignmentGuideStyle({
              guide,
              instance: flowInstanceRef.current,
              container: canvasViewportRef.current,
            });

            if (!style) {
              return null;
            }

            return <Box key={`${guide.axis}-${guide.position}`} sx={style} />;
          })}
        </Box>
      ) : null}
    </Box>
  );

  return (
    <Stack spacing={2}>
      {message ? <Alert severity={message.type}>{message.text}</Alert> : null}

      <FlowCanvasShell
        title={name}
        description={
          description ||
          "Editor de fluxograma com artefatos classicos, ligacoes rotuladas e swimlanes para documentacao real do workspace."
        }
        actions={headerActions}
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
            <Stack direction="row" spacing={1.25} alignItems="center">
              <CenterFocusStrongRounded fontSize="small" />
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                {flowchart.canManage
                  ? `${nodes.length} artefatos · ${edges.length} ligacoes · ${laneOptions.length} raia(s)${selectedNodes.length > 1 ? ` · ${selectedNodes.length} selecionados` : ""}${activeTool === "connect" ? " · modo conectar ativo" : ""}`
                  : `${nodes.length} artefatos · ${edges.length} ligacoes`}
              </Typography>
            </Stack>
          </Box>
        }
      />
    </Stack>
  );
}

function ManualNodeRenderer({ id, data, selected }: NodeProps<ManualCanvasNode>) {
  const context = useContext(ManualCanvasContext);

  if (!context) {
    return null;
  }

  const isConnectable = isConnectableNodeType(data.type);
  const showHandles =
    context.canManage &&
    isConnectable &&
    (context.activeTool === "connect" || selected || context.connectionGestureActive);

  return (
    <>
      {data.type === "SWIMLANE" ? (
        <NodeResizer
          isVisible={context.canManage && selected}
          minWidth={220}
          minHeight={180}
          color="#5D05FF"
          lineStyle={{ borderColor: "rgba(93, 5, 255, 0.3)" }}
          handleStyle={{
            width: 12,
            height: 12,
            borderRadius: 999,
            background: "#FFBB00",
            borderColor: "#0F0C17",
          }}
          onResize={(_event, params) =>
            context.onLaneResize(id, {
              width: params.width,
              height: params.height,
            })
          }
        />
      ) : null}

      {isConnectable ? (
        <>
          <NodeHandle
            id={FLOW_HANDLE_IDS.left}
            position={Position.Left}
            visible={showHandles}
            canManage={context.canManage}
          />
          <NodeHandle
            id={FLOW_HANDLE_IDS.right}
            position={Position.Right}
            visible={showHandles}
            canManage={context.canManage}
          />
          <NodeHandle
            id={FLOW_HANDLE_IDS.top}
            position={Position.Top}
            visible={showHandles}
            canManage={context.canManage}
          />
          <NodeHandle
            id={FLOW_HANDLE_IDS.bottom}
            position={Position.Bottom}
            visible={showHandles}
            canManage={context.canManage}
          />
        </>
      ) : null}

      <FlowNodeCard
        variant="manual"
        type={data.type}
        color={data.color}
        label={data.label}
        size={data.size}
        orientation={data.orientation}
        selected={selected}
        pendingConnection={context.pendingConnectionSourceId === id}
      />
    </>
  );
}

function NodeHandle({
  id,
  position,
  visible,
  canManage,
}: {
  id: string;
  position: Position;
  visible: boolean;
  canManage: boolean;
}) {
  return (
    <Handle
      id={id}
      type="source"
      position={position}
      isConnectable={canManage}
      isConnectableStart={canManage}
      isConnectableEnd={canManage}
      style={{
        width: 12,
        height: 12,
        borderRadius: 999,
        opacity: visible ? 1 : 0,
        pointerEvents: visible && canManage ? "auto" : "none",
        transition: "opacity 160ms ease, transform 160ms ease, box-shadow 160ms ease",
        transform: visible ? "scale(1)" : "scale(0.84)",
        border: "2px solid rgba(15, 12, 23, 0.92)",
        background: "#FFBB00",
        boxShadow: visible ? "0 0 0 4px rgba(93, 5, 255, 0.12)" : "none",
      }}
    />
  );
}

function FlowToolIcon({ tool }: { tool: "select" | "hand" | "connect" }) {
  if (tool === "hand") {
    return <PanToolAltRounded fontSize="small" />;
  }

  if (tool === "connect") {
    return <AltRouteRounded fontSize="small" />;
  }

  return <AdsClickRounded fontSize="small" />;
}

function ArtifactIcon({ type }: { type: FlowNodeType }) {
  const theme = useTheme();
  const borderColor = alpha(theme.palette.text.primary, 0.88);
  const fill = alpha(theme.palette.secondary.main, 0.08);

  return (
    <Box
      sx={{
        width: 24,
        height: 24,
        position: "relative",
      }}
    >
      {renderArtifactIcon(type, borderColor, fill)}
    </Box>
  );
}

function renderArtifactIcon(type: FlowNodeType, borderColor: string, fill: string): ReactNode {
  if (type === "START_END") {
    return <ShapeBox borderColor={borderColor} fill={fill} borderRadius={999} />;
  }

  if (type === "DECISION") {
    return (
      <ShapeBox
        borderColor={borderColor}
        fill={fill}
        transform="rotate(45deg)"
        borderRadius={2}
      />
    );
  }

  if (type === "DOCUMENT") {
    return (
      <>
        <ShapeBox borderColor={borderColor} fill={fill} borderRadius={2.5} />
        <Box
          sx={{
            position: "absolute",
            left: 1,
            right: 1,
            bottom: 1,
            height: 5,
            background: fill,
            clipPath: "polygon(0 45%, 20% 0, 40% 45%, 60% 0, 80% 45%, 100% 0, 100% 100%, 0 100%)",
            borderTop: "1px solid",
            borderColor,
          }}
        />
      </>
    );
  }

  if (type === "DATA_IO") {
    return <ShapeBox borderColor={borderColor} fill={fill} transform="skewX(-18deg)" borderRadius={2} />;
  }

  if (type === "MANUAL_OPERATION") {
    return (
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          clipPath: "polygon(9% 0%, 91% 0%, 100% 100%, 0% 100%)",
          border: "1px solid",
          borderColor,
          bgcolor: fill,
        }}
      />
    );
  }

  if (type === "SUBPROCESS") {
    return (
      <>
        <ShapeBox borderColor={borderColor} fill={fill} borderRadius={2.5} />
        <Box
          sx={{
            position: "absolute",
            top: 3,
            bottom: 3,
            left: 4,
            width: 1,
            bgcolor: borderColor,
          }}
        />
        <Box
          sx={{
            position: "absolute",
            top: 3,
            bottom: 3,
            right: 4,
            width: 1,
            bgcolor: borderColor,
          }}
        />
      </>
    );
  }

  if (type === "CONNECTOR") {
    return <ShapeBox borderColor={borderColor} fill={fill} borderRadius="50%" />;
  }

  if (type === "SWIMLANE") {
    return (
      <>
        <ShapeBox borderColor={borderColor} fill={alpha(fill, 0.35)} borderRadius={2.5} borderStyle="dashed" />
        <Box
          sx={{
            position: "absolute",
            top: 2,
            left: 2,
            right: 2,
            height: 4,
            borderRadius: 999,
            bgcolor: alpha(borderColor, 0.18),
          }}
        />
      </>
    );
  }

  if (type === "TEXT") {
    return (
      <Typography
        sx={{
          fontSize: 13,
          fontWeight: 900,
          color: borderColor,
          lineHeight: 1,
          pt: 0.2,
          textAlign: "center",
        }}
      >
        T
      </Typography>
    );
  }

  if (type === "NOTE") {
    return (
      <>
        <ShapeBox borderColor={borderColor} fill={alpha("#FFBB00", 0.2)} borderRadius={2.5} />
        <Box
          sx={{
            position: "absolute",
            top: 0,
            right: 0,
            width: 7,
            height: 7,
            background: alpha("#FFFFFF", 0.34),
            clipPath: "polygon(0 0, 100% 0, 100% 100%)",
          }}
        />
      </>
    );
  }

  return <ShapeBox borderColor={borderColor} fill={fill} borderRadius={2.5} />;
}

function ShapeBox({
  borderColor,
  fill,
  borderRadius,
  transform,
  borderStyle = "solid",
}: {
  borderColor: string;
  fill: string;
  borderRadius: number | string;
  transform?: string;
  borderStyle?: "solid" | "dashed";
}) {
  return (
    <Box
      sx={{
        position: "absolute",
        inset: 0,
        border: "1px solid",
        borderColor,
        borderStyle,
        borderRadius,
        bgcolor: fill,
        transform,
      }}
    />
  );
}

function MiniMenuButton({
  label,
  onClick,
  disabled = false,
  tone = "default",
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: "default" | "danger";
}) {
  return (
    <Tooltip title={label}>
      <Box>
        <Button
          size="small"
          variant="outlined"
          color={tone === "danger" ? "error" : "inherit"}
          disabled={disabled}
          onClick={onClick}
          sx={{
            minWidth: 0,
            px: 1.05,
            py: 0.45,
            borderRadius: 999,
            whiteSpace: "nowrap",
            fontSize: 11.5,
            fontWeight: 700,
            lineHeight: 1,
          }}
        >
          {label}
        </Button>
      </Box>
    </Tooltip>
  );
}

function ColorSwatch({
  color,
  selected,
  onClick,
}: {
  color: FlowNodeColorKey;
  selected: boolean;
  onClick: () => void;
}) {
  const theme = useTheme();
  const map: Record<FlowNodeColorKey, string> = {
    gold: "#FFBB00",
    violet: "#5D05FF",
    slate: alpha(theme.palette.text.secondary, 0.5),
    mint: "#18B56A",
    rose: "#F45EA4",
  };

  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      sx={{
        width: 30,
        height: 30,
        borderRadius: 999,
        border: "2px solid",
        borderColor: selected ? "secondary.main" : "transparent",
        bgcolor: map[color],
        cursor: "pointer",
      }}
    />
  );
}

function mapContentToGraph(content: FlowchartContent) {
  return {
    nodes: withNodeOrder(content.nodes.map((node) => toCanvasNode(node))),
    edges: content.edges.map((edge) => toCanvasEdge(edge)),
  };
}

function toCanvasNode(node: FlowchartNode): ManualCanvasNode {
  return {
    id: node.id,
    type: "manual",
    position: node.position,
    data: node.data,
    zIndex: node.data.type === "SWIMLANE" ? 0 : 10,
  };
}

function toCanvasEdge(edge: FlowchartEdge): ManualCanvasEdge {
  return {
    id: edge.id,
    type: "flow",
    source: edge.source,
    target: edge.target,
    sourceHandle: normalizeFlowHandleId(edge.sourceHandle) ?? FLOW_HANDLE_IDS.right,
    targetHandle: normalizeFlowHandleId(edge.targetHandle) ?? FLOW_HANDLE_IDS.left,
    data: {
      label: edge.label ?? "",
      connectionType: edge.type,
      accent: edge.style?.accent ?? "violet",
      lineStyle: edge.style?.lineStyle ?? "solid",
      editable: true,
    },
  };
}

function serializeGraph(
  nodes: ManualCanvasNode[],
  edges: ManualCanvasEdge[],
  instance: ReactFlowInstance<ManualCanvasNode, ManualCanvasEdge> | null,
): FlowchartContent {
  return {
    nodes: withNodeOrder(nodes).map((node) => ({
      id: node.id,
      position: node.position,
      data: node.data,
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle ?? undefined,
      targetHandle: edge.targetHandle ?? undefined,
      type: edge.data?.connectionType ?? "ARROW",
      label: edge.data?.label ?? "",
      style: {
        accent: edge.data?.accent ?? "violet",
        lineStyle: edge.data?.lineStyle ?? "solid",
      },
    })),
    viewport: instance?.getViewport() ?? {
      x: 0,
      y: 0,
      zoom: 1,
    },
  };
}

function withRenderedEdgeData(edges: ManualCanvasEdge[]) {
  const groupCounts = new Map<string, number>();

  edges.forEach((edge) => {
    const key = [edge.source, edge.target].sort().join("::");
    groupCounts.set(key, (groupCounts.get(key) ?? 0) + 1);
  });

  const groupIndexes = new Map<string, number>();

  return edges.map((edge) => {
    const key = [edge.source, edge.target].sort().join("::");
    const index = groupIndexes.get(key) ?? 0;
    const total = groupCounts.get(key) ?? 1;
    const offsetIndex = total > 1 ? index - (total - 1) / 2 : 0;
    const accent = edge.data?.accent ?? "violet";
    const color =
      accent === "gold" ? "#FFBB00" : accent === "neutral" ? "#8C839F" : "#5D05FF";
    const connectionType = edge.data?.connectionType ?? "ARROW";

    groupIndexes.set(key, index + 1);

    return {
      ...edge,
      data: {
        ...edge.data,
        connectionType,
        offsetIndex,
      },
      markerStart:
        connectionType === "BIDIRECTIONAL"
          ? {
              type: MarkerType.ArrowClosed,
              width: 22,
              height: 22,
              color,
            }
          : undefined,
      markerEnd:
        connectionType === "ARROW" || connectionType === "BIDIRECTIONAL"
          ? {
              type: MarkerType.ArrowClosed,
              width: 22,
              height: 22,
              color,
            }
          : undefined,
    };
  });
}

function withNodeOrder(nodes: ManualCanvasNode[]) {
  return [...nodes].sort((left, right) => {
    const leftLane = left.data.type === "SWIMLANE";
    const rightLane = right.data.type === "SWIMLANE";

    if (leftLane === rightLane) {
      return 0;
    }

    return leftLane ? -1 : 1;
  });
}

function isCreateTool(tool: FlowTool): tool is FlowNodeType {
  return flowNodeTypes.includes(tool as FlowNodeType);
}

function areStringArraysEqual(left: string[], right: string[]) {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((value, index) => value === right[index]);
}

function resolveEdgeHandles({
  sourceHandle,
  targetHandle,
  sourceNode,
  targetNode,
}: {
  sourceHandle?: string | null;
  targetHandle?: string | null;
  sourceNode: ManualCanvasNode | null;
  targetNode: ManualCanvasNode | null;
}) {
  if (sourceHandle && targetHandle) {
    return {
      sourceHandle,
      targetHandle,
    };
  }

  if (!sourceNode || !targetNode) {
    return {
      sourceHandle: FLOW_HANDLE_IDS.right,
      targetHandle: FLOW_HANDLE_IDS.left,
    };
  }

  const deltaX = targetNode.position.x - sourceNode.position.x;
  const deltaY = targetNode.position.y - sourceNode.position.y;

  if (Math.abs(deltaY) > Math.abs(deltaX)) {
    return {
      sourceHandle: FLOW_HANDLE_IDS.bottom,
      targetHandle: FLOW_HANDLE_IDS.top,
    };
  }

  return {
    sourceHandle: FLOW_HANDLE_IDS.right,
    targetHandle: FLOW_HANDLE_IDS.left,
  };
}

function normalizeFlowHandleId(handleId?: string | null) {
  if (!handleId) {
    return undefined;
  }

  if (handleId.endsWith("left")) {
    return FLOW_HANDLE_IDS.left;
  }

  if (handleId.endsWith("right")) {
    return FLOW_HANDLE_IDS.right;
  }

  if (handleId.endsWith("top")) {
    return FLOW_HANDLE_IDS.top;
  }

  if (handleId.endsWith("bottom")) {
    return FLOW_HANDLE_IDS.bottom;
  }

  return handleId;
}

function snapCanvasPosition(position: { x: number; y: number }) {
  return {
    x: Math.round(position.x / FLOW_CANVAS_SNAP_GRID[0]) * FLOW_CANVAS_SNAP_GRID[0],
    y: Math.round(position.y / FLOW_CANVAS_SNAP_GRID[1]) * FLOW_CANVAS_SNAP_GRID[1],
  };
}

function getMagneticAlignment(node: ManualCanvasNode, allNodes: ManualCanvasNode[]) {
  const comparableNodes = allNodes.filter(
    (candidate) => candidate.id !== node.id && candidate.data.type !== "SWIMLANE",
  );

  const sourceRect = getNodeRect(node);
  const sourceMetrics = getNodeMetrics(sourceRect);
  let closestX: AlignmentMatch | null = null;
  let closestXDistance = Number.POSITIVE_INFINITY;
  let closestY: AlignmentMatch | null = null;
  let closestYDistance = Number.POSITIVE_INFINITY;

  comparableNodes.forEach((candidate) => {
    const metrics = getNodeMetrics(getNodeRect(candidate));

    sourceMetrics.x.forEach(({ anchor, value: sourceValue }) => {
      metrics.x.forEach(({ value: targetValue }) => {
        const distance = Math.abs(sourceValue - targetValue);

        if (distance <= NODE_ALIGNMENT_THRESHOLD && distance < closestXDistance) {
          closestX = {
            axis: "x",
            position: targetValue,
            anchor,
          };
          closestXDistance = distance;
        }
      });
    });

    sourceMetrics.y.forEach(({ anchor, value: sourceValue }) => {
      metrics.y.forEach(({ value: targetValue }) => {
        const distance = Math.abs(sourceValue - targetValue);

        if (distance <= NODE_ALIGNMENT_THRESHOLD && distance < closestYDistance) {
          closestY = {
            axis: "y",
            position: targetValue,
            anchor,
          };
          closestYDistance = distance;
        }
      });
    });
  });

  const x = resolveAlignedCoordinate({
    position: node.position.x,
    size: node.data.size.width,
    match: closestX,
  });
  const y = resolveAlignedCoordinate({
    position: node.position.y,
    size: node.data.size.height,
    match: closestY,
  });

  const guides: Array<AlignmentGuide | null> = [closestX, closestY];

  return {
    position: {
      x,
      y,
    },
    guides: guides.filter((guide): guide is AlignmentGuide => guide !== null),
  };
}

function getNodeRect(node: ManualCanvasNode) {
  const width = node.data.size.width;
  const height = node.data.size.height;

  return {
    left: node.position.x,
    top: node.position.y,
    right: node.position.x + width,
    bottom: node.position.y + height,
    centerX: node.position.x + width / 2,
    centerY: node.position.y + height / 2,
  };
}

function getNodeMetrics(rect: ReturnType<typeof getNodeRect>) {
  return {
    x: [
      { anchor: "start" as const, value: rect.left },
      { anchor: "center" as const, value: rect.centerX },
      { anchor: "end" as const, value: rect.right },
    ],
    y: [
      { anchor: "start" as const, value: rect.top },
      { anchor: "center" as const, value: rect.centerY },
      { anchor: "end" as const, value: rect.bottom },
    ],
  };
}

function getSelectionBounds(nodes: ManualCanvasNode[]) {
  const bounds = nodes.map((node) => getNodeRect(node));

  return {
    left: Math.min(...bounds.map((rect) => rect.left)),
    right: Math.max(...bounds.map((rect) => rect.right)),
    top: Math.min(...bounds.map((rect) => rect.top)),
    bottom: Math.max(...bounds.map((rect) => rect.bottom)),
    centerX:
      (Math.min(...bounds.map((rect) => rect.left)) +
        Math.max(...bounds.map((rect) => rect.right))) /
      2,
    centerY:
      (Math.min(...bounds.map((rect) => rect.top)) +
        Math.max(...bounds.map((rect) => rect.bottom))) /
      2,
  };
}

function getSelectionMenuStyle({
  instance,
  container,
  bounds,
}: {
  instance: ReactFlowInstance<ManualCanvasNode, ManualCanvasEdge> | null;
  container: HTMLDivElement | null;
  bounds: ReturnType<typeof getSelectionBounds>;
}) {
  if (!instance || !container) {
    return null;
  }

  const point = instance.flowToScreenPosition({
    x: bounds.centerX,
    y: bounds.top,
  });
  const rect = container.getBoundingClientRect();
  const availableWidth = rect.width - 32;
  const left = Math.min(Math.max(point.x - rect.left, 120), Math.max(120, availableWidth));
  const top = Math.max(point.y - rect.top - 84, 16);

  return {
    left,
    top,
    transform: "translateX(-50%)",
  } as const;
}

function resolveAlignedCoordinate({
  position,
  size,
  match,
}: {
  position: number;
  size: number;
  match: AlignmentMatch | null;
}) {
  if (!match) {
    return position;
  }

  if (match.anchor === "center") {
    return match.position - size / 2;
  }

  if (match.anchor === "end") {
    return match.position - size;
  }

  return match.position;
}

function getAlignmentGuideStyle({
  guide,
  instance,
  container,
}: {
  guide: AlignmentGuide;
  instance: ReactFlowInstance<ManualCanvasNode, ManualCanvasEdge> | null;
  container: HTMLDivElement | null;
}) {
  if (!instance || !container) {
    return null;
  }

  const bounds = container.getBoundingClientRect();

  if (guide.axis === "x") {
    const point = instance.flowToScreenPosition({ x: guide.position, y: 0 });

    return {
      position: "absolute",
      top: 16,
      bottom: 16,
      left: point.x - bounds.left,
      width: 2,
      borderRadius: 999,
      background:
        "linear-gradient(180deg, rgba(255, 187, 0, 0.92), rgba(93, 5, 255, 0.88))",
      boxShadow: "0 0 0 4px rgba(255, 187, 0, 0.12), 0 0 20px rgba(93, 5, 255, 0.2)",
      opacity: 0.9,
    } as const;
  }

  const point = instance.flowToScreenPosition({ x: 0, y: guide.position });

  return {
    position: "absolute",
    left: 16,
    right: 16,
    top: point.y - bounds.top,
    height: 2,
    borderRadius: 999,
    background:
      "linear-gradient(90deg, rgba(255, 187, 0, 0.92), rgba(93, 5, 255, 0.88))",
    boxShadow: "0 0 0 4px rgba(255, 187, 0, 0.12), 0 0 20px rgba(93, 5, 255, 0.2)",
    opacity: 0.9,
  } as const;
}
