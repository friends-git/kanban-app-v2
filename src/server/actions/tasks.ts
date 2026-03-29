"use server";

import {
  GlobalRole,
  ProjectRole,
  ProjectVisibility,
  TaskPriority,
  TaskStatus,
  TaskType,
  TaskVisibility,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/server/auth/session";
import { db } from "@/server/db";
import {
  canCommentTask,
  canCreateTask,
  canManageTask,
} from "@/server/permissions";
import {
  buildSummary,
  generateNextTaskCode,
  getBoardColumnId,
  normalizeText,
  toOptionalDate,
} from "@/server/actions/utils";

const taskMutationSchema = z.object({
  title: z.string().trim().min(3, "Informe um título com pelo menos 3 caracteres."),
  projectId: z.string().min(1, "Selecione um projeto."),
  sprintId: z.string().optional().nullable(),
  assigneeIds: z.array(z.string()).default([]),
  status: z.nativeEnum(TaskStatus),
  priority: z.nativeEnum(TaskPriority),
  type: z.nativeEnum(TaskType),
  visibility: z.nativeEnum(TaskVisibility),
  blocked: z.boolean().default(false),
  dueDate: z.string().optional().nullable(),
  description: z.string().max(10000).optional().nullable(),
});

const updateTaskSchema = taskMutationSchema.extend({
  id: z.string().min(1),
});

const checklistItemSchema = z.object({
  taskId: z.string().min(1),
  itemId: z.string().min(1).optional(),
  content: z.string().trim().min(1, "Informe o conteúdo do item."),
});

const checklistToggleSchema = z.object({
  taskId: z.string().min(1),
  itemId: z.string().min(1),
  done: z.boolean(),
});

const checklistDeleteSchema = z.object({
  taskId: z.string().min(1),
  itemId: z.string().min(1),
});

const commentSchema = z.object({
  taskId: z.string().min(1),
  content: z.string().trim().min(1, "Escreva um comentário."),
});

const moveTaskSchema = z.object({
  taskId: z.string().min(1),
  status: z.nativeEnum(TaskStatus),
  sprintId: z.string().nullable().optional(),
});

type ActionResult =
  | { ok: true; taskId: string }
  | { ok: false; error: string };

type MutationViewer = {
  id: string;
  role: GlobalRole;
};

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

function revalidateTaskViews(projectId: string) {
  revalidatePath("/tasks");
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
  revalidatePath("/dashboard");
}

async function findProjectForMutation(projectId: string) {
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
      sprints: {
        select: {
          id: true,
          status: true,
          projectId: true,
        },
      },
    },
  });
}

async function resolveSprintId(project: Awaited<ReturnType<typeof findProjectForMutation>>, sprintId?: string | null) {
  if (!sprintId) {
    return null;
  }

  const sprint = project?.sprints.find((entry) => entry.id === sprintId);
  return sprint ? sprint.id : null;
}

export async function createTaskAction(
  input: z.input<typeof taskMutationSchema>,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = taskMutationSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos para criar a tarefa.",
    };
  }

  const project = await findProjectForMutation(parsed.data.projectId);

  if (!project) {
    return {
      ok: false,
      error: "Projeto não encontrado.",
    };
  }

  if (!canCreateTask(user, projectAccessShape(project))) {
    return {
      ok: false,
      error: "Você não tem permissão para criar tarefas neste projeto.",
    };
  }

  const code = await generateNextTaskCode();
  const description = normalizeText(parsed.data.description);
  const dueDate = toOptionalDate(parsed.data.dueDate);
  const sprintId = await resolveSprintId(project, parsed.data.sprintId);
  const boardColumnId = await getBoardColumnId(project.id, parsed.data.status);
  const assigneeIds = [...new Set(parsed.data.assigneeIds.filter(Boolean))];

  const task = await db.task.create({
    data: {
      code,
      title: parsed.data.title.trim(),
      summary: buildSummary(parsed.data.title, description),
      description,
      status: parsed.data.status,
      priority: parsed.data.priority,
      type: parsed.data.type,
      visibility: parsed.data.visibility,
      blocked: parsed.data.blocked,
      dueDate,
      projectId: project.id,
      sprintId,
      boardColumnId,
      creatorId: user.id,
      completedAt: parsed.data.status === TaskStatus.DONE ? new Date() : null,
      assignees: {
        create: assigneeIds.map((assigneeId) => ({
          userId: assigneeId,
        })),
      },
      historyEntries: {
        create: {
          actorId: user.id,
          type: "created",
          description: "Criou a tarefa.",
        },
      },
    },
    select: {
      id: true,
      projectId: true,
    },
  });

  revalidateTaskViews(task.projectId);

  return {
    ok: true,
    taskId: task.id,
  };
}

export async function updateTaskAction(
  input: z.input<typeof updateTaskSchema>,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = updateTaskSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos para atualizar a tarefa.",
    };
  }

  const existingTask = await db.task.findUnique({
    where: {
      id: parsed.data.id,
    },
    include: {
      assignees: {
        select: {
          userId: true,
        },
      },
      project: {
        select: {
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

  if (!existingTask) {
    return {
      ok: false,
      error: "Tarefa não encontrada.",
    };
  }

  if (!canManageTask(user, taskAccessShape(existingTask))) {
    return {
      ok: false,
      error: "Você não tem permissão para editar esta tarefa.",
    };
  }

  const targetProject = await findProjectForMutation(parsed.data.projectId);

  if (!targetProject) {
    return {
      ok: false,
      error: "Projeto de destino não encontrado.",
    };
  }

  if (!canCreateTask(user, projectAccessShape(targetProject))) {
    return {
      ok: false,
      error: "Você não tem permissão para mover a tarefa para este projeto.",
    };
  }

  const description = normalizeText(parsed.data.description);
  const dueDate = toOptionalDate(parsed.data.dueDate);
  const sprintId = await resolveSprintId(targetProject, parsed.data.sprintId);
  const boardColumnId = await getBoardColumnId(targetProject.id, parsed.data.status);
  const assigneeIds = [...new Set(parsed.data.assigneeIds.filter(Boolean))];
  const completedAt =
    parsed.data.status === TaskStatus.DONE
      ? existingTask.completedAt ?? new Date()
      : null;

  await db.task.update({
    where: {
      id: existingTask.id,
    },
    data: {
      title: parsed.data.title.trim(),
      summary: buildSummary(parsed.data.title, description),
      description,
      status: parsed.data.status,
      priority: parsed.data.priority,
      type: parsed.data.type,
      visibility: parsed.data.visibility,
      blocked: parsed.data.blocked,
      dueDate,
      projectId: targetProject.id,
      sprintId,
      boardColumnId,
      completedAt,
      assignees: {
        deleteMany: {},
        create: assigneeIds.map((assigneeId) => ({
          userId: assigneeId,
        })),
      },
      historyEntries: {
        create: {
          actorId: user.id,
          type: "updated",
          description: "Atualizou as propriedades principais da tarefa.",
        },
      },
    },
  });

  revalidateTaskViews(targetProject.id);

  if (existingTask.projectId !== targetProject.id) {
    revalidatePath(`/projects/${existingTask.projectId}`);
  }

  return {
    ok: true,
    taskId: existingTask.id,
  };
}

export async function moveTaskAction(
  input: z.input<typeof moveTaskSchema>,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = moveTaskSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Movimento de tarefa inválido.",
    };
  }

  const taskState = await getTaskForMutation(parsed.data.taskId, user);

  if ("error" in taskState) {
    return {
      ok: false,
      error: taskState.error ?? "Tarefa não encontrada.",
    };
  }

  if (!taskState.canManage) {
    return {
      ok: false,
      error: "Você não tem permissão para mover esta tarefa.",
    };
  }

  const nextSprintId =
    parsed.data.sprintId === undefined
      ? taskState.task.sprintId
      : parsed.data.sprintId;

  if (nextSprintId) {
    const targetSprint = await db.sprint.findUnique({
      where: {
        id: nextSprintId,
      },
      select: {
        id: true,
        projectId: true,
      },
    });

    if (!targetSprint || targetSprint.projectId !== taskState.task.project.id) {
      return {
        ok: false,
        error: "A sprint de destino não pertence ao projeto da tarefa.",
      };
    }
  }

  if (
    taskState.task.status === parsed.data.status &&
    taskState.task.sprintId === nextSprintId
  ) {
    return {
      ok: true,
      taskId: taskState.task.id,
    };
  }

  const boardColumnId = await getBoardColumnId(
    taskState.task.project.id,
    parsed.data.status,
  );
  const completedAt =
    parsed.data.status === TaskStatus.DONE
      ? taskState.task.completedAt ?? new Date()
      : null;

  await db.task.update({
    where: {
      id: taskState.task.id,
    },
    data: {
      status: parsed.data.status,
      sprintId: nextSprintId,
      boardColumnId,
      completedAt,
      historyEntries: {
        create: {
          actorId: user.id,
          type: "updated",
          description:
            parsed.data.sprintId === undefined
              ? "Moveu a tarefa entre status."
              : "Moveu a tarefa entre status e sprint.",
        },
      },
    },
  });

  revalidateTaskViews(taskState.task.project.id);

  return {
    ok: true,
    taskId: taskState.task.id,
  };
}

async function getTaskForMutation(taskId: string, user: MutationViewer) {
  const task = await db.task.findUnique({
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

  if (!task) {
    return {
      error: "Tarefa não encontrada.",
    } as const;
  }

  return {
    task,
    canManage: canManageTask(user, taskAccessShape(task)),
    canComment: canCommentTask(user, taskAccessShape(task)),
  } as const;
}

export async function createChecklistItemAction(
  input: z.input<typeof checklistItemSchema>,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = checklistItemSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Item de checklist inválido.",
    };
  }

  const taskState = await getTaskForMutation(parsed.data.taskId, user);

  if ("error" in taskState) {
    return {
      ok: false,
      error: taskState.error ?? "Tarefa não encontrada.",
    };
  }

  if (!taskState.canManage) {
    return {
      ok: false,
      error: "Você não pode editar o checklist desta tarefa.",
    };
  }

  const lastItem = await db.taskChecklistItem.findFirst({
    where: {
      taskId: taskState.task.id,
    },
    orderBy: {
      position: "desc",
    },
    select: {
      position: true,
    },
  });

  await db.taskChecklistItem.create({
    data: {
      taskId: taskState.task.id,
      content: parsed.data.content.trim(),
      position: (lastItem?.position ?? -1) + 1,
    },
  });

  revalidateTaskViews(taskState.task.project.id);

  return {
    ok: true,
    taskId: taskState.task.id,
  };
}

export async function updateChecklistItemAction(
  input: z.input<typeof checklistItemSchema>,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = checklistItemSchema.safeParse(input);

  if (!parsed.success || !parsed.data.itemId) {
    return {
      ok: false,
      error: "Item de checklist inválido.",
    };
  }

  const taskState = await getTaskForMutation(parsed.data.taskId, user);

  if ("error" in taskState) {
    return {
      ok: false,
      error: taskState.error ?? "Tarefa não encontrada.",
    };
  }

  if (!taskState.canManage) {
    return {
      ok: false,
      error: "Você não pode editar o checklist desta tarefa.",
    };
  }

  await db.taskChecklistItem.updateMany({
    where: {
      id: parsed.data.itemId,
      taskId: taskState.task.id,
    },
    data: {
      content: parsed.data.content.trim(),
    },
  });

  revalidateTaskViews(taskState.task.project.id);

  return {
    ok: true,
    taskId: taskState.task.id,
  };
}

export async function toggleChecklistItemAction(
  input: z.input<typeof checklistToggleSchema>,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = checklistToggleSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: "Item de checklist inválido.",
    };
  }

  const taskState = await getTaskForMutation(parsed.data.taskId, user);

  if ("error" in taskState) {
    return {
      ok: false,
      error: taskState.error ?? "Tarefa não encontrada.",
    };
  }

  if (!taskState.canManage) {
    return {
      ok: false,
      error: "Você não pode editar o checklist desta tarefa.",
    };
  }

  await db.taskChecklistItem.updateMany({
    where: {
      id: parsed.data.itemId,
      taskId: taskState.task.id,
    },
    data: {
      done: parsed.data.done,
    },
  });

  revalidateTaskViews(taskState.task.project.id);

  return {
    ok: true,
    taskId: taskState.task.id,
  };
}

export async function deleteChecklistItemAction(
  input: z.input<typeof checklistDeleteSchema>,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = checklistDeleteSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: "Item de checklist inválido.",
    };
  }

  const taskState = await getTaskForMutation(parsed.data.taskId, user);

  if ("error" in taskState) {
    return {
      ok: false,
      error: taskState.error ?? "Tarefa não encontrada.",
    };
  }

  if (!taskState.canManage) {
    return {
      ok: false,
      error: "Você não pode editar o checklist desta tarefa.",
    };
  }

  await db.taskChecklistItem.deleteMany({
    where: {
      id: parsed.data.itemId,
      taskId: taskState.task.id,
    },
  });

  revalidateTaskViews(taskState.task.project.id);

  return {
    ok: true,
    taskId: taskState.task.id,
  };
}

export async function addTaskCommentAction(
  input: z.input<typeof commentSchema>,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = commentSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Comentário inválido.",
    };
  }

  const taskState = await getTaskForMutation(parsed.data.taskId, user);

  if ("error" in taskState) {
    return {
      ok: false,
      error: taskState.error ?? "Tarefa não encontrada.",
    };
  }

  if (!taskState.canComment) {
    return {
      ok: false,
      error: "Você não pode comentar nesta tarefa.",
    };
  }

  await db.taskComment.create({
    data: {
      taskId: taskState.task.id,
      authorId: user.id,
      content: parsed.data.content.trim(),
    },
  });

  revalidateTaskViews(taskState.task.project.id);

  return {
    ok: true,
    taskId: taskState.task.id,
  };
}
