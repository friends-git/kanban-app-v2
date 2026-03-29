import { TaskStatus } from "@prisma/client";
import { db } from "@/server/db";

export const defaultBoardColumns = [
  { name: "Backlog", position: 0, taskStatus: TaskStatus.BACKLOG },
  { name: "A fazer", position: 1, taskStatus: TaskStatus.TODO },
  { name: "Em andamento", position: 2, taskStatus: TaskStatus.IN_PROGRESS },
  { name: "Em revisão", position: 3, taskStatus: TaskStatus.REVIEW },
  { name: "Concluído", position: 4, taskStatus: TaskStatus.DONE },
] as const;

export function normalizeText(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export function buildSummary(
  fallbackTitle: string,
  description: string | null | undefined,
) {
  const source = normalizeText(description) ?? fallbackTitle.trim();
  return source.replace(/\s+/g, " ").slice(0, 160);
}

export function toOptionalDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function slugify(value: string) {
  const slug = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "projeto";
}

export async function createUniqueProjectSlug(
  name: string,
  excludeProjectId?: string,
) {
  const baseSlug = slugify(name);
  const existingProjects = await db.project.findMany({
    where: excludeProjectId
      ? {
          slug: {
            startsWith: baseSlug,
          },
          NOT: {
            id: excludeProjectId,
          },
        }
      : {
          slug: {
            startsWith: baseSlug,
          },
        },
    select: {
      slug: true,
    },
  });

  if (!existingProjects.some((project) => project.slug === baseSlug)) {
    return baseSlug;
  }

  const occupiedSlugs = new Set(existingProjects.map((project) => project.slug));
  let suffix = 2;

  while (occupiedSlugs.has(`${baseSlug}-${suffix}`)) {
    suffix += 1;
  }

  return `${baseSlug}-${suffix}`;
}

export async function generateNextTaskCode() {
  const tasks = await db.task.findMany({
    select: {
      code: true,
    },
  });

  const nextNumber =
    tasks.reduce((highest, task) => {
      const match = task.code.match(/(\d+)$/);
      const current = match ? Number(match[1]) : 0;
      return current > highest ? current : highest;
    }, 0) + 1;

  return `TCC-${String(nextNumber).padStart(3, "0")}`;
}

export async function getBoardColumnId(projectId: string, status: TaskStatus) {
  const column = await db.boardColumn.findFirst({
    where: {
      board: {
        projectId,
      },
      taskStatus: status,
    },
    select: {
      id: true,
    },
  });

  return column?.id ?? null;
}
