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
import { Alert, Box, Stack, Typography } from "@mui/material";
import { SprintStatus, TaskPriority, TaskStatus } from "@prisma/client";
import { useRouter } from "next/navigation";
import {
  DatabaseBoard,
  DatabaseBoardColumn,
  DatabaseBoardEmptyState,
} from "@/components/database/database-board";
import {
  DatabaseGroup,
  DatabaseSurface,
} from "@/components/database/database-list";
import { TaskCard } from "@/components/ui/task-card";
import { sprintStatusLabels, taskStatusLabels } from "@/lib/domain";
import { moveTaskAction } from "@/server/actions/tasks";

const statusOrder = [
  TaskStatus.BACKLOG,
  TaskStatus.TODO,
  TaskStatus.IN_PROGRESS,
  TaskStatus.REVIEW,
  TaskStatus.DONE,
] as const;

type TaskSprintBoardItem = {
  id: string;
  href: string;
  code: string;
  title: string;
  summary: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  project: {
    id: string;
    name: string;
  };
  sprint: {
    id: string;
    name: string;
    status: SprintStatus;
  } | null;
  assignees: Array<{
    user: {
      id: string;
      name: string;
      avatarColor: string | null;
    };
  }>;
  tags: Array<{
    tag: {
      id: string;
      name: string;
      color: string;
    };
  }>;
};

type SprintGroup = {
  id: string;
  name: string;
  status: SprintStatus;
  projectId: string;
};

type TaskSprintBoardsDndProps = {
  tasks: TaskSprintBoardItem[];
  sprints: SprintGroup[];
};

type SprintDropTarget = {
  type: "task-sprint-status";
  sprintId: string;
  sprintStatus: SprintStatus;
  projectId: string;
  status: TaskStatus;
};

export function TaskSprintBoardsDnd({
  tasks,
  sprints,
}: TaskSprintBoardsDndProps) {
  const router = useRouter();
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );
  const [items, setItems] = useState(tasks);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setItems(tasks);
  }, [tasks]);

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over) {
      return;
    }

    const target = over.data.current as SprintDropTarget | undefined;

    if (target?.type !== "task-sprint-status") {
      return;
    }

    const taskId = String(active.id);
    const task = items.find((entry) => entry.id === taskId);

    if (!task || !task.sprint) {
      return;
    }

    if (task.project.id !== target.projectId) {
      setError("A tarefa só pode ser movida para uma sprint do mesmo projeto.");
      return;
    }

    if (task.status === target.status && task.sprint.id === target.sprintId) {
      return;
    }

    const targetSprint = sprints.find((sprint) => sprint.id === target.sprintId);

    if (!targetSprint) {
      return;
    }

    setError(null);
    const previousItems = items;
    const nextItems = items.map((entry) =>
      entry.id === taskId
        ? {
            ...entry,
            status: target.status,
            sprint: {
              id: targetSprint.id,
              name: targetSprint.name,
              status: targetSprint.status,
            },
          }
        : entry,
    );

    setItems(nextItems);

    startTransition(async () => {
      const result = await moveTaskAction({
        taskId,
        status: target.status,
        sprintId: target.sprintId,
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
        <DatabaseSurface>
          {sprints.map((sprint) => (
            <DatabaseGroup
              key={sprint.id}
              title={sprint.name}
              count={items.filter((task) => task.sprint?.id === sprint.id).length}
              defaultExpanded={sprint.status === "ACTIVE"}
            >
              <Stack spacing={1.1} sx={{ px: 1.25, py: 1.25 }}>
                <Typography color="text.secondary" variant="body2" sx={{ px: 0.5 }}>
                  {sprintStatusLabels[sprint.status]}
                </Typography>

                <DatabaseBoard>
                  {statusOrder.map((status) => (
                    <SprintStatusColumn
                      key={`${sprint.id}:${status}`}
                      sprint={sprint}
                      status={status}
                      items={items.filter(
                        (task) =>
                          task.sprint?.id === sprint.id && task.status === status,
                      )}
                    />
                  ))}
                </DatabaseBoard>
              </Stack>
            </DatabaseGroup>
          ))}
        </DatabaseSurface>
      </DndContext>
    </Stack>
  );
}

function SprintStatusColumn({
  sprint,
  status,
  items,
}: {
  sprint: SprintGroup;
  status: TaskStatus;
  items: TaskSprintBoardItem[];
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `task-sprint:${sprint.id}:status:${status}`,
    data: {
      type: "task-sprint-status",
      sprintId: sprint.id,
      sprintStatus: sprint.status,
      projectId: sprint.projectId,
      status,
    } satisfies SprintDropTarget,
  });

  return (
    <Box ref={setNodeRef}>
      <DatabaseBoardColumn
        title={taskStatusLabels[status]}
        count={items.length}
        highlighted={isOver}
      >
        {items.length ? (
          items.map((task) => <DraggableSprintTaskCard key={task.id} task={task} />)
        ) : (
          <DatabaseBoardEmptyState message="Nenhuma tarefa nesta coluna." />
        )}
      </DatabaseBoardColumn>
    </Box>
  );
}

function DraggableSprintTaskCard({
  task,
}: {
  task: TaskSprintBoardItem;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
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
      <TaskCard
        task={{
          id: task.id,
          code: task.code,
          title: task.title,
          summary: task.summary,
          status: task.status,
          priority: task.priority,
          dueDate: task.dueDate ? new Date(task.dueDate) : null,
          assignees: task.assignees,
          tags: task.tags,
        }}
        href={task.href}
        contextLabel={task.project.name}
      />
    </Box>
  );
}
