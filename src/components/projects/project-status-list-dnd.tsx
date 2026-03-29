"use client";

import { useEffect, useState, useTransition } from "react";
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { Alert, Box, Typography } from "@mui/material";
import { ProjectStatus } from "@prisma/client";
import { useRouter } from "next/navigation";
import {
  DatabaseGroup,
  DatabaseListHeader,
  DatabaseRow,
  DatabaseSurface,
} from "@/components/database/database-list";
import { projectStatusLabels } from "@/lib/domain";
import { formatDate } from "@/lib/formatters";
import { moveProjectStatusAction } from "@/server/actions/projects";

const projectStatusOrder = [
  ProjectStatus.PLANNING,
  ProjectStatus.ACTIVE,
  ProjectStatus.AT_RISK,
  ProjectStatus.ON_HOLD,
  ProjectStatus.COMPLETED,
] as const;

type ProjectStatusListItem = {
  id: string;
  name: string;
  slug: string;
  summary: string;
  status: ProjectStatus;
  dueDate: string | null;
  team?: { name: string } | null;
  owner: { name: string };
  _count: {
    tasks: number;
  };
};

type ProjectListDropTarget = {
  type: "project-status-list";
  status: ProjectStatus;
};

type ProjectStatusListDndProps = {
  projects: ProjectStatusListItem[];
};

const columns = {
  xs: "minmax(0, 1fr) auto",
  md: "minmax(0, 1.8fr) 140px 150px 120px 72px",
};

export function ProjectStatusListDnd({
  projects,
}: ProjectStatusListDndProps) {
  const router = useRouter();
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );
  const [items, setItems] = useState(projects);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setItems(projects);
  }, [projects]);

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over) {
      return;
    }

    const target = over.data.current as ProjectListDropTarget | undefined;

    if (target?.type !== "project-status-list") {
      return;
    }

    const projectId = String(active.id);
    const project = items.find((entry) => entry.id === projectId);

    if (!project || project.status === target.status) {
      return;
    }

    setError(null);
    const previousItems = items;
    const nextItems = items.map((entry) =>
      entry.id === projectId ? { ...entry, status: target.status } : entry,
    );

    setItems(nextItems);

    startTransition(async () => {
      const result = await moveProjectStatusAction({
        projectId,
        status: target.status,
      });

      if (!result.ok) {
        setItems(previousItems);
        setError(result.error);
        return;
      }

      router.refresh();
    });
  };

  return (
    <Box>
      {error ? <Alert severity="error" sx={{ mb: 1.25 }}>{error}</Alert> : null}

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <DatabaseSurface>
          <DatabaseListHeader columns={columns}>
            <Box component="span">Projeto</Box>
            <Box component="span" sx={{ display: { xs: "none", md: "block" } }}>
              Equipe
            </Box>
            <Box component="span" sx={{ display: { xs: "none", md: "block" } }}>
              Responsável
            </Box>
            <Box component="span">Prazo</Box>
            <Box component="span" sx={{ display: { xs: "none", md: "block" } }}>
              Tarefas
            </Box>
          </DatabaseListHeader>

          {projectStatusOrder.map((status) => (
            <ProjectStatusListGroup
              key={status}
              status={status}
              items={items.filter((project) => project.status === status)}
            />
          ))}
        </DatabaseSurface>
      </DndContext>
    </Box>
  );
}

function ProjectStatusListGroup({
  status,
  items,
}: {
  status: ProjectStatus;
  items: ProjectStatusListItem[];
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `project-list-status:${status}`,
    data: {
      type: "project-status-list",
      status,
    } satisfies ProjectListDropTarget,
  });

  return (
    <DatabaseGroup
      title={projectStatusLabels[status]}
      count={items.length}
      defaultExpanded={status !== "COMPLETED"}
      highlighted={isOver}
      contentSx={{
        bgcolor: isOver ? "action.hover" : "transparent",
      }}
    >
      <Box
        ref={setNodeRef}
        sx={{
          "& > * + *": {
            borderTop: "1px solid",
            borderColor: "divider",
          },
        }}
      >
        {items.length ? (
          items.map((project) => (
            <DraggableProjectRow key={project.id} project={project} />
          ))
        ) : (
          <Box sx={{ px: 2.25, py: 1.6 }}>
            <Typography color="text.secondary" variant="body2">
              Nenhum projeto neste grupo.
            </Typography>
          </Box>
        )}
      </Box>
    </DatabaseGroup>
  );
}

function DraggableProjectRow({
  project,
}: {
  project: ProjectStatusListItem;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: project.id,
  });

  return (
    <Box
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      sx={{
        cursor: "grab",
        touchAction: "none",
        opacity: isDragging ? 0.42 : 1,
        transform: transform
          ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
          : undefined,
      }}
    >
      <DatabaseRow href={`/projects/${project.id}`} columns={columns}>
        <Box sx={{ minWidth: 0 }}>
          <Typography fontWeight={700}>{project.name}</Typography>
          <Typography color="text.secondary" variant="body2" noWrap>
            {project.summary}
          </Typography>
        </Box>
        <Typography
          color="text.secondary"
          variant="body2"
          sx={{ display: { xs: "none", md: "block" } }}
        >
          {project.team?.name ?? "Sem equipe"}
        </Typography>
        <Typography
          color="text.secondary"
          variant="body2"
          sx={{ display: { xs: "none", md: "block" } }}
        >
          {project.owner.name}
        </Typography>
        <Typography color="text.secondary" variant="body2">
          {formatDate(project.dueDate ? new Date(project.dueDate) : null)}
        </Typography>
        <Typography
          color="text.secondary"
          variant="body2"
          sx={{ display: { xs: "none", md: "block" } }}
        >
          {project._count.tasks}
        </Typography>
      </DatabaseRow>
    </Box>
  );
}
