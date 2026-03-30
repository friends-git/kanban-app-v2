export const flowNodeTypes = [
  "NOTE",
  "START_END",
  "PROCESS",
  "DECISION",
  "DOCUMENT",
  "DATA_IO",
  "MANUAL_OPERATION",
  "SUBPROCESS",
  "CONNECTOR",
  "SWIMLANE",
  "TEXT",
] as const;

export type FlowNodeType = (typeof flowNodeTypes)[number];

export const flowLaneOrientations = ["VERTICAL", "HORIZONTAL"] as const;

export type FlowLaneOrientation = (typeof flowLaneOrientations)[number];

export const flowEdgeTypes = ["LINE", "ARROW", "BIDIRECTIONAL"] as const;

export type FlowEdgeType = (typeof flowEdgeTypes)[number];

export const flowNodeColorKeys = [
  "gold",
  "violet",
  "slate",
  "mint",
  "rose",
] as const;

export type FlowNodeColorKey = (typeof flowNodeColorKeys)[number];

export const flowEdgeAccents = ["gold", "violet", "neutral"] as const;

export type FlowEdgeAccent = (typeof flowEdgeAccents)[number];

export const flowEdgeLineStyles = ["solid", "dashed"] as const;

export type FlowEdgeLineStyle = (typeof flowEdgeLineStyles)[number];

export type FlowchartNodeSize = {
  width: number;
  height: number;
};

export type FlowchartNodeData = {
  label: string;
  type: FlowNodeType;
  color: FlowNodeColorKey;
  size: FlowchartNodeSize;
  orientation?: FlowLaneOrientation;
};

export type FlowchartNode = {
  id: string;
  position: {
    x: number;
    y: number;
  };
  data: FlowchartNodeData;
};

export type FlowchartEdgeStyle = {
  accent?: FlowEdgeAccent;
  lineStyle?: FlowEdgeLineStyle;
};

export type FlowchartEdge = {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  type: FlowEdgeType;
  label?: string;
  style?: FlowchartEdgeStyle;
};

export type FlowchartViewport = {
  x: number;
  y: number;
  zoom: number;
};

export type FlowchartContent = {
  nodes: FlowchartNode[];
  edges: FlowchartEdge[];
  viewport?: FlowchartViewport;
};

export type FlowTool = "select" | "hand" | "connect" | FlowNodeType;

export const flowToolLabels: Record<FlowTool, string> = {
  select: "Selecionar",
  hand: "Mover visao",
  connect: "Conectar",
  NOTE: "Nota",
  START_END: "Inicio/Fim",
  PROCESS: "Processo",
  DECISION: "Decisao",
  DOCUMENT: "Documento",
  DATA_IO: "Entrada/Saida",
  MANUAL_OPERATION: "Operacao manual",
  SUBPROCESS: "Subprocesso",
  CONNECTOR: "Conector",
  SWIMLANE: "Raia",
  TEXT: "Texto",
};

const defaultViewport: FlowchartViewport = {
  x: 0,
  y: 0,
  zoom: 1,
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function getDefaultNodeColor(type: FlowNodeType): FlowNodeColorKey {
  switch (type) {
    case "NOTE":
      return "gold";
    case "DECISION":
    case "SWIMLANE":
      return "violet";
    case "DOCUMENT":
    case "DATA_IO":
      return "mint";
    case "TEXT":
      return "slate";
    case "START_END":
      return "gold";
    case "CONNECTOR":
      return "rose";
    case "PROCESS":
    case "MANUAL_OPERATION":
    case "SUBPROCESS":
    default:
      return "slate";
  }
}

export function getDefaultNodeSize(
  type: FlowNodeType,
  orientation: FlowLaneOrientation = "VERTICAL",
): FlowchartNodeSize {
  switch (type) {
    case "START_END":
      return { width: 220, height: 92 };
    case "DECISION":
      return { width: 196, height: 196 };
    case "DOCUMENT":
      return { width: 240, height: 144 };
    case "DATA_IO":
      return { width: 244, height: 132 };
    case "MANUAL_OPERATION":
      return { width: 240, height: 124 };
    case "SUBPROCESS":
      return { width: 252, height: 132 };
    case "CONNECTOR":
      return { width: 84, height: 84 };
    case "SWIMLANE":
      return orientation === "HORIZONTAL"
        ? { width: 880, height: 220 }
        : { width: 300, height: 620 };
    case "TEXT":
      return { width: 260, height: 64 };
    case "NOTE":
      return { width: 240, height: 172 };
    case "PROCESS":
    default:
      return { width: 248, height: 132 };
  }
}

export function getDefaultEdgeStyle(): FlowchartEdgeStyle {
  return {
    accent: "violet",
    lineStyle: "solid",
  };
}

export function sanitizeFlowchartContent(input: unknown): FlowchartContent {
  if (!isObject(input)) {
    return {
      nodes: [],
      edges: [],
      viewport: defaultViewport,
    };
  }

  const rawNodes = Array.isArray(input.nodes) ? input.nodes : [];
  const rawEdges = Array.isArray(input.edges) ? input.edges : [];
  const rawViewport = isObject(input.viewport) ? input.viewport : null;

  const nodes = rawNodes
    .filter(isObject)
    .map((node) => {
      const type = readNodeType(node);
      const orientation = readLaneOrientation(node);
      const size = readNodeSize(node, type, orientation);

      return {
        id: typeof node.id === "string" ? node.id : createFlowEntityId("node"),
        position: {
          x:
            isObject(node.position) && typeof node.position.x === "number"
              ? node.position.x
              : 0,
          y:
            isObject(node.position) && typeof node.position.y === "number"
              ? node.position.y
              : 0,
        },
        data: {
          label:
            isObject(node.data) && typeof node.data.label === "string"
              ? node.data.label
              : defaultNodeLabel(type),
          type,
          color:
            isObject(node.data) &&
            typeof node.data.color === "string" &&
            isFlowNodeColor(node.data.color)
              ? node.data.color
              : getDefaultNodeColor(type),
          size,
          orientation: type === "SWIMLANE" ? orientation : undefined,
        },
      } satisfies FlowchartNode;
    });

  const nodeIds = new Set(nodes.map((node) => node.id));

  const edges = rawEdges
    .filter(isObject)
    .map((edge) => {
      const legacyStyle = isObject(edge.data) ? edge.data : null;

      return {
        id: typeof edge.id === "string" ? edge.id : createFlowEntityId("edge"),
        source: typeof edge.source === "string" ? edge.source : "",
        target: typeof edge.target === "string" ? edge.target : "",
        sourceHandle: typeof edge.sourceHandle === "string" ? edge.sourceHandle : undefined,
        targetHandle: typeof edge.targetHandle === "string" ? edge.targetHandle : undefined,
        type:
          typeof edge.type === "string" && isFlowEdgeType(edge.type)
            ? edge.type
            : edge.type === "FLOW"
              ? "ARROW"
            : "ARROW",
        label:
          typeof edge.label === "string"
            ? edge.label
            : legacyStyle && typeof legacyStyle.label === "string"
              ? legacyStyle.label
              : "",
        style: {
          accent:
            isObject(edge.style) &&
            typeof edge.style.accent === "string" &&
            isFlowEdgeAccent(edge.style.accent)
              ? edge.style.accent
              : legacyStyle &&
                  typeof legacyStyle.accent === "string" &&
                  isFlowEdgeAccent(legacyStyle.accent)
                ? legacyStyle.accent
                : getDefaultEdgeStyle().accent,
          lineStyle:
            isObject(edge.style) &&
            typeof edge.style.lineStyle === "string" &&
            isFlowEdgeLineStyle(edge.style.lineStyle)
              ? edge.style.lineStyle
              : getDefaultEdgeStyle().lineStyle,
        },
      } satisfies FlowchartEdge;
    })
    .filter(
      (edge) =>
        edge.source && edge.target && nodeIds.has(edge.source) && nodeIds.has(edge.target),
    );

  return {
    nodes,
    edges,
    viewport: {
      x: rawViewport && typeof rawViewport.x === "number" ? rawViewport.x : defaultViewport.x,
      y: rawViewport && typeof rawViewport.y === "number" ? rawViewport.y : defaultViewport.y,
      zoom:
        rawViewport && typeof rawViewport.zoom === "number"
          ? rawViewport.zoom
          : defaultViewport.zoom,
    },
  };
}

export function createBlankFlowchartContent(label?: string): FlowchartContent {
  if (!label) {
    return {
      nodes: [],
      edges: [],
      viewport: defaultViewport,
    };
  }

  return {
    nodes: [
      createFlowchartNode({
        type: "PROCESS",
        label,
        color: "gold",
        position: {
          x: 140,
          y: 120,
        },
      }),
    ],
    edges: [],
    viewport: defaultViewport,
  };
}

export function createTaskFlowchartContent(taskTitle: string) {
  return createBlankFlowchartContent(taskTitle);
}

export function createProjectFlowchartContent(projectName: string) {
  return createBlankFlowchartContent(projectName);
}

export function createWorkspaceFlowchartContent(flowchartName: string) {
  return createBlankFlowchartContent(flowchartName);
}

export function createFlowchartNode(input: {
  type: FlowNodeType;
  label?: string;
  color?: FlowNodeColorKey;
  orientation?: FlowLaneOrientation;
  size?: Partial<FlowchartNodeSize>;
  position: {
    x: number;
    y: number;
  };
}) {
  const orientation = input.type === "SWIMLANE" ? input.orientation ?? "VERTICAL" : undefined;
  const defaultSize = getDefaultNodeSize(input.type, orientation ?? "VERTICAL");

  return {
    id: createFlowEntityId("node"),
    position: input.position,
    data: {
      label: input.label ?? defaultNodeLabel(input.type),
      type: input.type,
      color: input.color ?? getDefaultNodeColor(input.type),
      size: {
        width: input.size?.width ?? defaultSize.width,
        height: input.size?.height ?? defaultSize.height,
      },
      orientation,
    },
  } satisfies FlowchartNode;
}

export function createFlowchartEdge(input: {
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  type?: FlowEdgeType;
  label?: string;
  accent?: FlowEdgeAccent;
  lineStyle?: FlowEdgeLineStyle;
}) {
  return {
    id: createFlowEntityId("edge"),
    source: input.source,
    target: input.target,
    sourceHandle: input.sourceHandle,
    targetHandle: input.targetHandle,
    type: input.type ?? "ARROW",
    label: input.label ?? "",
    style: {
      accent: input.accent ?? getDefaultEdgeStyle().accent,
      lineStyle: input.lineStyle ?? getDefaultEdgeStyle().lineStyle,
    },
  } satisfies FlowchartEdge;
}

export function duplicateFlowchartNode(node: FlowchartNode) {
  return {
    ...node,
    id: createFlowEntityId("node"),
    position: {
      x: node.position.x + 36,
      y: node.position.y + 36,
    },
    data: {
      ...node.data,
      size: {
        width: node.data.size.width,
        height: node.data.size.height,
      },
    },
  } satisfies FlowchartNode;
}

export function defaultNodeLabel(type: FlowNodeType) {
  switch (type) {
    case "NOTE":
      return "Nova nota";
    case "START_END":
      return "Inicio/Fim";
    case "PROCESS":
      return "Processo";
    case "DECISION":
      return "Decisao";
    case "DOCUMENT":
      return "Documento";
    case "DATA_IO":
      return "Entrada/Saida";
    case "MANUAL_OPERATION":
      return "Operacao manual";
    case "SUBPROCESS":
      return "Subprocesso";
    case "CONNECTOR":
      return "Conector";
    case "SWIMLANE":
      return "Nova raia";
    case "TEXT":
    default:
      return "Texto";
  }
}

export function isLaneNodeType(type: FlowNodeType) {
  return type === "SWIMLANE";
}

export function isConnectableNodeType(type: FlowNodeType) {
  return type !== "TEXT" && type !== "SWIMLANE";
}

export function createFlowEntityId(prefix: "node" | "edge") {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function readNodeType(node: Record<string, unknown>): FlowNodeType {
  if (
    isObject(node.data) &&
    typeof node.data.type === "string" &&
    isFlowNodeType(node.data.type)
  ) {
    return node.data.type;
  }

  if (
    isObject(node.data) &&
    typeof node.data.kind === "string" &&
    isLegacyFlowNodeKind(node.data.kind)
  ) {
    return mapLegacyNodeKind(node.data.kind);
  }

  return "PROCESS";
}

function readLaneOrientation(
  node: Record<string, unknown>,
): FlowLaneOrientation {
  if (
    isObject(node.data) &&
    typeof node.data.orientation === "string" &&
    isFlowLaneOrientation(node.data.orientation)
  ) {
    return node.data.orientation;
  }

  return "VERTICAL";
}

function readNodeSize(
  node: Record<string, unknown>,
  type: FlowNodeType,
  orientation: FlowLaneOrientation,
) {
  const defaultSize = getDefaultNodeSize(type, orientation);

  if (
    isObject(node.data) &&
    isObject(node.data.size) &&
    typeof node.data.size.width === "number" &&
    typeof node.data.size.height === "number"
  ) {
    return {
      width: Math.max(node.data.size.width, getMinimumNodeSize(type).width),
      height: Math.max(node.data.size.height, getMinimumNodeSize(type).height),
    };
  }

  return defaultSize;
}

function getMinimumNodeSize(type: FlowNodeType): FlowchartNodeSize {
  switch (type) {
    case "SWIMLANE":
      return { width: 220, height: 180 };
    case "CONNECTOR":
      return { width: 64, height: 64 };
    case "TEXT":
      return { width: 160, height: 42 };
    default:
      return { width: 120, height: 72 };
  }
}

function isFlowNodeType(value: string): value is FlowNodeType {
  return flowNodeTypes.includes(value as FlowNodeType);
}

function isFlowLaneOrientation(value: string): value is FlowLaneOrientation {
  return flowLaneOrientations.includes(value as FlowLaneOrientation);
}

function isFlowNodeColor(value: string): value is FlowNodeColorKey {
  return flowNodeColorKeys.includes(value as FlowNodeColorKey);
}

function isFlowEdgeType(value: string): value is FlowEdgeType {
  return flowEdgeTypes.includes(value as FlowEdgeType);
}

function isFlowEdgeAccent(value: string): value is FlowEdgeAccent {
  return flowEdgeAccents.includes(value as FlowEdgeAccent);
}

function isFlowEdgeLineStyle(value: string): value is FlowEdgeLineStyle {
  return flowEdgeLineStyles.includes(value as FlowEdgeLineStyle);
}

const legacyFlowNodeKinds = ["sticky", "rectangle", "diamond", "text"] as const;

type LegacyFlowNodeKind = (typeof legacyFlowNodeKinds)[number];

function isLegacyFlowNodeKind(value: string): value is LegacyFlowNodeKind {
  return legacyFlowNodeKinds.includes(value as LegacyFlowNodeKind);
}

function mapLegacyNodeKind(kind: LegacyFlowNodeKind): FlowNodeType {
  switch (kind) {
    case "sticky":
      return "NOTE";
    case "diamond":
      return "DECISION";
    case "text":
      return "TEXT";
    case "rectangle":
    default:
      return "PROCESS";
  }
}
