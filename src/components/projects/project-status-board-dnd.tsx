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
import { Alert, Box, Stack } from "@mui/material";
import { ProjectStatus } from "@prisma/client";
import { useRouter } from "next/navigation";
import {
  DatabaseBoard,
  DatabaseBoardColumn,
  DatabaseBoardEmptyState,
} from "@/components/database/database-board";
import { ProjectCard } from "@/components/ui/project-card";
import { projectStatusLabels } from "@/lib/domain";
import { moveProjectStatusAction } from "@/server/actions/projects";

const projectStatusOrder = [
  ProjectStatus.PLANNING,
  ProjectStatus.ACTIVE,
  ProjectStatus.AT_RISK,
  ProjectStatus.ON_HOLD,
  ProjectStatus.COMPLETED,
] as const;

type ProjectStatusBoardItem = {
  id: string;
  name: string;
  summary: string;
  status: ProjectStatus;
  visibility: string;
  dueDate: string | null;
  team?: { name: string } | null;
  owner: { name: string };
  members: Array<{
    user: {
      id: string;
      name: string;
      avatarColor: string | null;
    };
  }>;
  _count: {
    tasks: number;
    sprints: number;
  };
};

type ProjectStatusDropTarget = {
  type: "project-status";
  status: ProjectStatus;
};

type ProjectStatusBoardDndProps = {
  projects: ProjectStatusBoardItem[];
};

export function ProjectStatusBoardDnd({
  projects,
}: ProjectStatusBoardDndProps) {
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

    const target = over.data.current as ProjectStatusDropTarget | undefined;

    if (target?.type !== "project-status") {
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
    <Stack spacing={1.25}>
      {error ? <Alert severity="error">{error}</Alert> : null}

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <DatabaseBoard>
          {projectStatusOrder.map((status) => {
            const columnItems = items.filter((project) => project.status === status);

            return (
              <ProjectStatusColumn
                key={status}
                status={status}
                items={columnItems}
              />
            );
          })}
        </DatabaseBoard>
      </DndContext>
    </Stack>
  );
}

function ProjectStatusColumn({
  status,
  items,
}: {
  status: ProjectStatus;
  items: ProjectStatusBoardItem[];
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `project-status:${status}`,
    data: {
      type: "project-status",
      status,
    } satisfies ProjectStatusDropTarget,
  });

  return (
    <Box ref={setNodeRef}>
      <DatabaseBoardColumn
        title={projectStatusLabels[status]}
        count={items.length}
        highlighted={isOver}
      >
        {items.length ? (
          items.map((project) => <DraggableProjectCard key={project.id} project={project} />)
        ) : (
          <DatabaseBoardEmptyState message="Nenhum projeto nesta coluna." />
        )}
      </DatabaseBoardColumn>
    </Box>
  );
}

function DraggableProjectCard({
  project,
}: {
  project: ProjectStatusBoardItem;
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
        transition: isDragging ? "none" : "opacity 180ms ease",
      }}
    >
      <ProjectCard
        project={{
          ...project,
          dueDate: project.dueDate ? new Date(project.dueDate) : null,
        }}
      />
    </Box>
  );
}
