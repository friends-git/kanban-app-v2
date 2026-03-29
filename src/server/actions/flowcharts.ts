"use server";

import {
  FlowchartScopeType,
  FlowchartType,
  GlobalRole,
  Prisma,
  ProjectRole,
  ProjectVisibility,
  TaskVisibility,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  createProjectFlowchartContent,
  createTaskFlowchartContent,
  sanitizeFlowchartContent,
} from "@/lib/flowcharts";
import { requireUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { canManageProject, canManageTask } from "@/server/permissions";
import { normalizeText } from "@/server/actions/utils";

type ActionResult =
  | { ok: true; flowchartId: string }
  | { ok: false; error: string };

type MutationViewer = {
  id: string;
  role: GlobalRole;
};

const flowchartContentSchema = z.object({
  nodes: z
    .array(
      z.object({
        id: z.string().min(1),
        position: z.object({
          x: z.number(),
          y: z.number(),
        }),
        data: z.object({
          label: z.string(),
        }),
      }),
    )
    .default([]),
  edges: z
    .array(
      z.object({
        id: z.string().min(1),
        source: z.string().min(1),
        target: z.string().min(1),
      }),
    )
    .default([]),
  viewport: z
    .object({
      x: z.number(),
      y: z.number(),
      zoom: z.number(),
    })
    .optional(),
});

const createProjectFlowchartSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().trim().min(3, "Informe um nome com pelo menos 3 caracteres."),
  description: z.string().max(5000).optional().nullable(),
});

const ensureTaskFlowchartSchema = z.object({
  taskId: z.string().min(1),
});

const saveFlowchartSchema = z.object({
  flowchartId: z.string().min(1),
  name: z.string().trim().min(3, "Informe um nome com pelo menos 3 caracteres."),
  description: z.string().max(5000).optional().nullable(),
  content: flowchartContentSchema,
});

const duplicateFlowchartSchema = z.object({
  flowchartId: z.string().min(1),
});

const archiveFlowchartSchema = z.object({
  flowchartId: z.string().min(1),
});

function projectAccessShape(project: {
  visibility: ProjectVisibility;
  ownerId: string;
  members: Array<{ userId: string; role: ProjectRole }>;
}) {
  return {
    visibility: project.visibility,
    ownerId: project.ownerId,
    members: project.members,
  };
}

function taskAccessShape(task: {
  creatorId: string;
  visibility: TaskVisibility;
  assignees: Array<{ userId: string }>;
  project: {
    visibility: ProjectVisibility;
    ownerId: string;
    members: Array<{ userId: string; role: ProjectRole }>;
  };
}) {
  return {
    creatorId: task.creatorId,
    visibility: task.visibility,
    assignees: task.assignees,
    project: projectAccessShape(task.project),
  };
}

function revalidateFlowchartPaths(input: {
  flowchartId?: string;
  projectId?: string | null;
  taskId?: string | null;
}) {
  revalidatePath("/projects");

  if (input.projectId) {
    revalidatePath(`/projects/${input.projectId}`);
  }

  if (input.taskId) {
    revalidatePath("/tasks");
  }

  if (input.flowchartId) {
    revalidatePath(`/flowcharts/${input.flowchartId}`);
  }
}

async function getProjectForMutation(projectId: string) {
  return db.project.findUnique({
    where: {
      id: projectId,
    },
    include: {
      members: {
        select: {
          userId: true,
          role: true,
        },
      },
    },
  });
}

async function getTaskForMutation(taskId: string) {
  return db.task.findUnique({
    where: {
      id: taskId,
    },
    include: {
      assignees: {
        select: {
          userId: true,
        },
      },
      project: {
        select: {
          id: true,
          name: true,
          visibility: true,
          ownerId: true,
          members: {
            select: {
              userId: true,
              role: true,
            },
          },
        },
      },
    },
  });
}

async function getFlowchartForMutation(flowchartId: string, user: MutationViewer) {
  const flowchart = await db.flowchart.findUnique({
    where: {
      id: flowchartId,
    },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          visibility: true,
          ownerId: true,
          members: {
            select: {
              userId: true,
              role: true,
            },
          },
        },
      },
      task: {
        select: {
          id: true,
          title: true,
          code: true,
          creatorId: true,
          visibility: true,
          assignees: {
            select: {
              userId: true,
            },
          },
          project: {
            select: {
              id: true,
              name: true,
              visibility: true,
              ownerId: true,
              members: {
                select: {
                  userId: true,
                  role: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!flowchart) {
    return {
      error: "Fluxograma não encontrado.",
    } as const;
  }

  if (flowchart.type !== FlowchartType.MANUAL || flowchart.isArchived) {
    return {
      error: "Este fluxograma não pode ser editado.",
    } as const;
  }

  if (flowchart.scopeType === FlowchartScopeType.PROJECT) {
    if (!flowchart.project) {
      return {
        error: "Projeto do fluxograma não encontrado.",
      } as const;
    }

    return {
      flowchart,
      canManage: canManageProject(user, projectAccessShape(flowchart.project)),
      projectId: flowchart.project.id,
      taskId: flowchart.task?.id ?? null,
    } as const;
  }

  if (!flowchart.task) {
    return {
      error: "Tarefa do fluxograma não encontrada.",
    } as const;
  }

  return {
    flowchart,
    canManage: canManageTask(user, taskAccessShape(flowchart.task)),
    projectId: flowchart.task.project.id,
    taskId: flowchart.task.id,
  } as const;
}

export async function createProjectFlowchartAction(
  input: z.input<typeof createProjectFlowchartSchema>,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = createProjectFlowchartSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos para criar o diagrama.",
    };
  }

  const project = await getProjectForMutation(parsed.data.projectId);

  if (!project) {
    return {
      ok: false,
      error: "Projeto não encontrado.",
    };
  }

  if (!canManageProject(user, projectAccessShape(project))) {
    return {
      ok: false,
      error: "Você não tem permissão para criar diagramas neste projeto.",
    };
  }

  const flowchart = await db.flowchart.create({
    data: {
      name: parsed.data.name.trim(),
      description: normalizeText(parsed.data.description),
      type: FlowchartType.MANUAL,
      scopeType: FlowchartScopeType.PROJECT,
      projectId: project.id,
      createdById: user.id,
      contentJson: createProjectFlowchartContent(project.name) as Prisma.InputJsonValue,
    },
    select: {
      id: true,
    },
  });

  revalidateFlowchartPaths({
    flowchartId: flowchart.id,
    projectId: project.id,
  });

  return {
    ok: true,
    flowchartId: flowchart.id,
  };
}

export async function ensureTaskFlowchartAction(
  input: z.input<typeof ensureTaskFlowchartSchema>,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = ensureTaskFlowchartSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: "Tarefa inválida para o diagrama.",
    };
  }

  const task = await getTaskForMutation(parsed.data.taskId);

  if (!task) {
    return {
      ok: false,
      error: "Tarefa não encontrada.",
    };
  }

  if (!canManageTask(user, taskAccessShape(task))) {
    return {
      ok: false,
      error: "Você não tem permissão para editar o diagrama desta tarefa.",
    };
  }

  const existingFlowchart = await db.flowchart.findFirst({
    where: {
      type: FlowchartType.MANUAL,
      scopeType: FlowchartScopeType.TASK,
      taskId: task.id,
      isArchived: false,
    },
    select: {
      id: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  if (existingFlowchart) {
    return {
      ok: true,
      flowchartId: existingFlowchart.id,
    };
  }

  const flowchart = await db.flowchart.create({
    data: {
      name: `Diagrama · ${task.code}`,
      description: `Fluxo manual vinculado à tarefa ${task.code}.`,
      type: FlowchartType.MANUAL,
      scopeType: FlowchartScopeType.TASK,
      taskId: task.id,
      createdById: user.id,
      contentJson: createTaskFlowchartContent(task.title) as Prisma.InputJsonValue,
    },
    select: {
      id: true,
    },
  });

  revalidateFlowchartPaths({
    flowchartId: flowchart.id,
    projectId: task.project.id,
    taskId: task.id,
  });

  return {
    ok: true,
    flowchartId: flowchart.id,
  };
}

export async function saveFlowchartAction(
  input: z.input<typeof saveFlowchartSchema>,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = saveFlowchartSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos para salvar o diagrama.",
    };
  }

  const flowchartState = await getFlowchartForMutation(parsed.data.flowchartId, user);

  if ("error" in flowchartState) {
    return {
      ok: false,
      error: flowchartState.error ?? "Fluxograma não encontrado.",
    };
  }

  if (!flowchartState.canManage) {
    return {
      ok: false,
      error: "Você não tem permissão para editar este diagrama.",
    };
  }

  await db.flowchart.update({
    where: {
      id: flowchartState.flowchart.id,
    },
    data: {
      name: parsed.data.name.trim(),
      description: normalizeText(parsed.data.description),
      contentJson: sanitizeFlowchartContent(parsed.data.content) as Prisma.InputJsonValue,
    },
  });

  revalidateFlowchartPaths({
    flowchartId: flowchartState.flowchart.id,
    projectId: flowchartState.projectId,
    taskId: flowchartState.taskId,
  });

  return {
    ok: true,
    flowchartId: flowchartState.flowchart.id,
  };
}

export async function duplicateFlowchartAction(
  input: z.input<typeof duplicateFlowchartSchema>,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = duplicateFlowchartSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: "Fluxograma inválido para duplicação.",
    };
  }

  const flowchartState = await getFlowchartForMutation(parsed.data.flowchartId, user);

  if ("error" in flowchartState) {
    return {
      ok: false,
      error: flowchartState.error ?? "Fluxograma não encontrado.",
    };
  }

  if (!flowchartState.canManage) {
    return {
      ok: false,
      error: "Você não tem permissão para duplicar este diagrama.",
    };
  }

  if (flowchartState.flowchart.scopeType !== FlowchartScopeType.PROJECT) {
    return {
      ok: false,
      error: "A duplicação está disponível apenas para diagramas do projeto.",
    };
  }

  const duplicated = await db.flowchart.create({
    data: {
      name: `${flowchartState.flowchart.name} (cópia)`,
      description: flowchartState.flowchart.description,
      type: FlowchartType.MANUAL,
      scopeType: FlowchartScopeType.PROJECT,
      projectId: flowchartState.projectId,
      createdById: user.id,
      contentJson: sanitizeFlowchartContent(flowchartState.flowchart.contentJson) as Prisma.InputJsonValue,
    },
    select: {
      id: true,
    },
  });

  revalidateFlowchartPaths({
    flowchartId: duplicated.id,
    projectId: flowchartState.projectId,
  });

  return {
    ok: true,
    flowchartId: duplicated.id,
  };
}

export async function archiveFlowchartAction(
  input: z.input<typeof archiveFlowchartSchema>,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = archiveFlowchartSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: "Fluxograma inválido para exclusão.",
    };
  }

  const flowchartState = await getFlowchartForMutation(parsed.data.flowchartId, user);

  if ("error" in flowchartState) {
    return {
      ok: false,
      error: flowchartState.error ?? "Fluxograma não encontrado.",
    };
  }

  if (!flowchartState.canManage) {
    return {
      ok: false,
      error: "Você não tem permissão para excluir este diagrama.",
    };
  }

  await db.flowchart.update({
    where: {
      id: flowchartState.flowchart.id,
    },
    data: {
      isArchived: true,
    },
  });

  revalidateFlowchartPaths({
    projectId: flowchartState.projectId,
    taskId: flowchartState.taskId,
  });

  return {
    ok: true,
    flowchartId: flowchartState.flowchart.id,
  };
}
