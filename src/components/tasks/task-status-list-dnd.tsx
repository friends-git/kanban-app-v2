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
import { TaskPriority, TaskStatus } from "@prisma/client";
import { useRouter } from "next/navigation";
import {
  DatabaseGroup,
  DatabaseListHeader,
  DatabaseRow,
  DatabaseSurface,
} from "@/components/database/database-list";
import { AvatarStack } from "@/components/ui/avatar-stack";
import { taskStatusLabels } from "@/lib/domain";
import { formatDate } from "@/lib/formatters";
import { moveTaskAction } from "@/server/actions/tasks";

const statusOrder = [
  TaskStatus.BACKLOG,
  TaskStatus.TODO,
  TaskStatus.IN_PROGRESS,
  TaskStatus.REVIEW,
  TaskStatus.DONE,
] as const;

type TaskStatusListItem = {
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
  } | null;
  assignees: Array<{
    user: {
      id: string;
      name: string;
      avatarColor: string | null;
    };
  }>;
};

type TaskStatusListDndProps = {
  tasks: TaskStatusListItem[];
  variant: "workspace" | "project";
};

type TaskListDropTarget = {
  type: "task-status-list";
  status: TaskStatus;
};

export function TaskStatusListDnd({
  tasks,
  variant,
}: TaskStatusListDndProps) {
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

    const target = over.data.current as TaskListDropTarget | undefined;

    if (target?.type !== "task-status-list") {
      return;
    }

    const taskId = String(active.id);
    const task = items.find((entry) => entry.id === taskId);

    if (!task || task.status === target.status) {
      return;
    }

    setError(null);
    const previousItems = items;
    const nextItems = items.map((entry) =>
      entry.id === taskId ? { ...entry, status: target.status } : entry,
    );

    setItems(nextItems);

    startTransition(async () => {
      const result = await moveTaskAction({
        taskId,
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

  const columns =
    variant === "workspace"
      ? {
          xs: "minmax(0, 1fr) auto",
          md: "minmax(0, 1.9fr) 150px 120px 120px 120px",
        }
      : {
          xs: "minmax(0, 1fr) auto",
          md: "minmax(0, 1.7fr) 140px 120px 120px",
        };

  return (
    <Box>
      {error ? <Alert severity="error" sx={{ mb: 1.25 }}>{error}</Alert> : null}

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <DatabaseSurface>
          <DatabaseListHeader columns={columns}>
            <Box component="span">Tarefa</Box>
            {variant === "workspace" ? (
              <>
                <Box component="span" sx={{ display: { xs: "none", md: "block" } }}>
                  Projeto
                </Box>
                <Box component="span" sx={{ display: { xs: "none", md: "block" } }}>
                  Sprint
                </Box>
                <Box component="span" sx={{ display: { xs: "none", md: "block" } }}>
                  Responsáveis
                </Box>
              </>
            ) : (
              <>
                <Box component="span" sx={{ display: { xs: "none", md: "block" } }}>
                  Responsáveis
                </Box>
                <Box component="span" sx={{ display: { xs: "none", md: "block" } }}>
                  Sprint
                </Box>
              </>
            )}
            <Box component="span">Prazo</Box>
          </DatabaseListHeader>

          {statusOrder.map((status) => (
            <TaskStatusListGroup
              key={status}
              status={status}
              items={items.filter((task) => task.status === status)}
              variant={variant}
              columns={columns}
            />
          ))}
        </DatabaseSurface>
      </DndContext>
    </Box>
  );
}

function TaskStatusListGroup({
  status,
  items,
  variant,
  columns,
}: {
  status: TaskStatus;
  items: TaskStatusListItem[];
  variant: "workspace" | "project";
  columns: Record<string, string>;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `task-list-status:${status}`,
    data: {
      type: "task-status-list",
      status,
    } satisfies TaskListDropTarget,
  });

  return (
    <DatabaseGroup
      title={taskStatusLabels[status]}
      count={items.length}
      defaultExpanded={status !== "DONE"}
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
          items.map((task) => (
            <DraggableTaskRow
              key={task.id}
              task={task}
              variant={variant}
              columns={columns}
            />
          ))
        ) : (
          <Box sx={{ px: 2.25, py: 1.6 }}>
            <Typography color="text.secondary" variant="body2">
              Nenhuma tarefa neste grupo.
            </Typography>
          </Box>
        )}
      </Box>
    </DatabaseGroup>
  );
}

function DraggableTaskRow({
  task,
  variant,
  columns,
}: {
  task: TaskStatusListItem;
  variant: "workspace" | "project";
  columns: Record<string, string>;
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
      }}
    >
      <DatabaseRow href={task.href} columns={columns}>
        <Box sx={{ minWidth: 0 }}>
          <Typography fontWeight={700}>{task.title}</Typography>
          <Typography color="text.secondary" variant="body2" noWrap>
            {task.code} • {task.summary ?? "Sem resumo"}
          </Typography>
          <Typography
            color="text.secondary"
            variant="caption"
            sx={{ display: { xs: "block", md: "none" }, mt: 0.45 }}
          >
            {variant === "workspace"
              ? `${task.project.name}${task.sprint ? ` • ${task.sprint.name}` : ""}`
              : (task.sprint?.name ?? "Sem sprint")}
          </Typography>
        </Box>

        {variant === "workspace" ? (
          <>
            <Typography
              color="text.secondary"
              variant="body2"
              sx={{ display: { xs: "none", md: "block" } }}
            >
              {task.project.name}
            </Typography>
            <Typography
              color="text.secondary"
              variant="body2"
              sx={{ display: { xs: "none", md: "block" } }}
            >
              {task.sprint?.name ?? "Sem sprint"}
            </Typography>
            <Box sx={{ display: { xs: "none", md: "block" } }}>
              <AvatarStack
                max={4}
                items={task.assignees.map((assignee) => ({
                  id: assignee.user.id,
                  name: assignee.user.name,
                  avatarColor: assignee.user.avatarColor,
                }))}
              />
            </Box>
          </>
        ) : (
          <>
            <Box sx={{ display: { xs: "none", md: "block" } }}>
              <AvatarStack
                max={4}
                items={task.assignees.map((assignee) => ({
                  id: assignee.user.id,
                  name: assignee.user.name,
                  avatarColor: assignee.user.avatarColor,
                }))}
              />
            </Box>
            <Typography
              color="text.secondary"
              variant="body2"
              sx={{ display: { xs: "none", md: "block" } }}
            >
              {task.sprint?.name ?? "Sem sprint"}
            </Typography>
          </>
        )}

        <Typography color="text.secondary" variant="body2">
          {formatDate(task.dueDate ? new Date(task.dueDate) : null)}
        </Typography>
      </DatabaseRow>
    </Box>
  );
}
