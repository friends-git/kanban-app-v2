"use server";

import {
  ProjectComplexity,
  ProjectPriority,
  ProjectRole,
  ProjectStatus,
  ProjectVisibility,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { canCreateProject, canManageProject } from "@/server/permissions";
import {
  buildSummary,
  createUniqueProjectSlug,
  defaultBoardColumns,
  normalizeText,
  toOptionalDate,
} from "@/server/actions/utils";

const projectMutationSchema = z.object({
  name: z.string().trim().min(3, "Informe um nome com pelo menos 3 caracteres."),
  ownerId: z.string().min(1, "Selecione um responsável."),
  status: z.nativeEnum(ProjectStatus),
  priority: z.nativeEnum(ProjectPriority),
  complexity: z.nativeEnum(ProjectComplexity),
  visibility: z.nativeEnum(ProjectVisibility),
  dueDate: z.string().optional().nullable(),
  description: z.string().max(5000).optional().nullable(),
  teamId: z.string().optional().nullable(),
});

const updateProjectSchema = projectMutationSchema.extend({
  id: z.string().min(1),
});

const moveProjectStatusSchema = z.object({
  projectId: z.string().min(1),
  status: z.nativeEnum(ProjectStatus),
});

type ProjectMutationResult =
  | { ok: true; projectId: string }
  | { ok: false; error: string };

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

function revalidateProjectViews(projectId: string) {
  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
}

export async function createProjectAction(
  input: z.input<typeof projectMutationSchema>,
): Promise<ProjectMutationResult> {
  const user = await requireUser();

  if (!canCreateProject(user)) {
    return {
      ok: false,
      error: "Você não tem permissão para criar projetos.",
    };
  }

  const parsed = projectMutationSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos para criar o projeto.",
    };
  }

  const [owner, team] = await Promise.all([
    db.user.findFirst({
      where: {
        id: parsed.data.ownerId,
        active: true,
      },
      select: {
        id: true,
      },
    }),
    parsed.data.teamId
      ? db.team.findUnique({
          where: {
            id: parsed.data.teamId,
          },
          select: {
            id: true,
          },
        })
      : Promise.resolve(null),
  ]);

  if (!owner) {
    return {
      ok: false,
      error: "Responsável do projeto inválido.",
    };
  }

  if (parsed.data.teamId && !team) {
    return {
      ok: false,
      error: "Equipe selecionada não foi encontrada.",
    };
  }

  const slug = await createUniqueProjectSlug(parsed.data.name);
  const description = normalizeText(parsed.data.description);
  const dueDate = toOptionalDate(parsed.data.dueDate);

  const project = await db.project.create({
    data: {
      name: parsed.data.name.trim(),
      slug,
      summary: buildSummary(parsed.data.name, description),
      description,
      ownerId: owner.id,
      status: parsed.data.status,
      priority: parsed.data.priority,
      complexity: parsed.data.complexity,
      visibility: parsed.data.visibility,
      teamId: team?.id ?? null,
      startDate: new Date(),
      dueDate,
      members: {
        create: [
          {
            userId: owner.id,
            role: ProjectRole.PROJECT_MANAGER,
          },
          ...(owner.id === user.id
            ? []
            : [
                {
                  userId: user.id,
                  role: ProjectRole.PROJECT_MANAGER,
                },
              ]),
        ],
      },
      board: {
        create: {
          name: `${parsed.data.name.trim()} Board`,
          columns: {
            create: defaultBoardColumns.map((column) => ({
              name: column.name,
              position: column.position,
              taskStatus: column.taskStatus,
            })),
          },
        },
      },
    },
    select: {
      id: true,
    },
  });

  revalidateProjectViews(project.id);

  return {
    ok: true,
    projectId: project.id,
  };
}

export async function updateProjectAction(
  input: z.input<typeof updateProjectSchema>,
): Promise<ProjectMutationResult> {
  const user = await requireUser();
  const parsed = updateProjectSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos para atualizar o projeto.",
    };
  }

  const project = await db.project.findUnique({
    where: {
      id: parsed.data.id,
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

  if (!project) {
    return {
      ok: false,
      error: "Projeto não encontrado.",
    };
  }

  if (!canManageProject(user, projectAccessShape(project))) {
    return {
      ok: false,
      error: "Você não tem permissão para editar este projeto.",
    };
  }

  const [owner, team] = await Promise.all([
    db.user.findFirst({
      where: {
        id: parsed.data.ownerId,
        active: true,
      },
      select: {
        id: true,
      },
    }),
    parsed.data.teamId
      ? db.team.findUnique({
          where: {
            id: parsed.data.teamId,
          },
          select: {
            id: true,
          },
        })
      : Promise.resolve(null),
  ]);

  if (!owner) {
    return {
      ok: false,
      error: "Responsável do projeto inválido.",
    };
  }

  if (parsed.data.teamId && !team) {
    return {
      ok: false,
      error: "Equipe selecionada não foi encontrada.",
    };
  }

  const description = normalizeText(parsed.data.description);
  const dueDate = toOptionalDate(parsed.data.dueDate);
  const slug = await createUniqueProjectSlug(parsed.data.name, project.id);

  await db.$transaction([
    db.project.update({
      where: {
        id: project.id,
      },
      data: {
        name: parsed.data.name.trim(),
        slug,
        summary: buildSummary(parsed.data.name, description),
        description,
        ownerId: owner.id,
        status: parsed.data.status,
        priority: parsed.data.priority,
        complexity: parsed.data.complexity,
        visibility: parsed.data.visibility,
        teamId: team?.id ?? null,
        dueDate,
      },
    }),
    db.projectMember.upsert({
      where: {
        projectId_userId: {
          projectId: project.id,
          userId: owner.id,
        },
      },
      create: {
        projectId: project.id,
        userId: owner.id,
        role: ProjectRole.PROJECT_MANAGER,
      },
      update: {
        role: ProjectRole.PROJECT_MANAGER,
      },
    }),
  ]);

  revalidateProjectViews(project.id);

  return {
    ok: true,
    projectId: project.id,
  };
}

export async function moveProjectStatusAction(
  input: z.input<typeof moveProjectStatusSchema>,
): Promise<ProjectMutationResult> {
  const user = await requireUser();
  const parsed = moveProjectStatusSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Movimento de projeto inválido.",
    };
  }

  const project = await db.project.findUnique({
    where: {
      id: parsed.data.projectId,
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

  if (!project) {
    return {
      ok: false,
      error: "Projeto não encontrado.",
    };
  }

  if (!canManageProject(user, projectAccessShape(project))) {
    return {
      ok: false,
      error: "Você não tem permissão para mover este projeto.",
    };
  }

  if (project.status === parsed.data.status) {
    return {
      ok: true,
      projectId: project.id,
    };
  }

  await db.project.update({
    where: {
      id: project.id,
    },
    data: {
      status: parsed.data.status,
    },
  });

  revalidateProjectViews(project.id);

  return {
    ok: true,
    projectId: project.id,
  };
}
