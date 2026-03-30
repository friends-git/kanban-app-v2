export type FlowchartNode = {
  id: string;
  position: {
    x: number;
    y: number;
  };
  data: {
    label: string;
  };
};

export type FlowchartEdge = {
  id: string;
  source: string;
  target: string;
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

const defaultViewport: FlowchartViewport = {
  x: 0,
  y: 0,
  zoom: 1,
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
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
    .map((node) => ({
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
            : "",
      },
    }));

  const nodeIds = new Set(nodes.map((node) => node.id));

  const edges = rawEdges
    .filter(isObject)
    .map((edge) => ({
      id: typeof edge.id === "string" ? edge.id : createFlowEntityId("edge"),
      source: typeof edge.source === "string" ? edge.source : "",
      target: typeof edge.target === "string" ? edge.target : "",
    }))
    .filter((edge) => edge.source && edge.target && nodeIds.has(edge.source) && nodeIds.has(edge.target));

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
      {
        id: createFlowEntityId("node"),
        position: {
          x: 140,
          y: 120,
        },
        data: {
          label,
        },
      },
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

export function createFlowEntityId(prefix: "node" | "edge") {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}
