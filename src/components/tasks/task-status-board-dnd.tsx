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
import { TaskPriority, TaskStatus } from "@prisma/client";
import { useRouter } from "next/navigation";
import {
  DatabaseBoard,
  DatabaseBoardColumn,
  DatabaseBoardEmptyState,
} from "@/components/database/database-board";
import { TaskCard } from "@/components/ui/task-card";
import { taskStatusLabels } from "@/lib/domain";
import { moveTaskAction } from "@/server/actions/tasks";

const statusOrder = [
  TaskStatus.BACKLOG,
  TaskStatus.TODO,
  TaskStatus.IN_PROGRESS,
  TaskStatus.REVIEW,
  TaskStatus.DONE,
] as const;

type TaskStatusBoardItem = {
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

type TaskStatusBoardDndProps = {
  tasks: TaskStatusBoardItem[];
  showProjectContext?: boolean;
};

type TaskDropTarget = {
  type: "task-status";
  status: TaskStatus;
};

export function TaskStatusBoardDnd({
  tasks,
  showProjectContext = false,
}: TaskStatusBoardDndProps) {
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

    const target = over.data.current as TaskDropTarget | undefined;

    if (target?.type !== "task-status") {
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

  return (
    <Stack spacing={1.25}>
      {error ? <Alert severity="error">{error}</Alert> : null}

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <DatabaseBoard>
          {statusOrder.map((status) => {
            const columnItems = items.filter((task) => task.status === status);

            return (
              <TaskStatusColumn
                key={status}
                status={status}
                items={columnItems}
                showProjectContext={showProjectContext}
              />
            );
          })}
        </DatabaseBoard>
      </DndContext>
    </Stack>
  );
}

function TaskStatusColumn({
  status,
  items,
  showProjectContext,
}: {
  status: TaskStatus;
  items: TaskStatusBoardItem[];
  showProjectContext: boolean;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `task-status:${status}`,
    data: {
      type: "task-status",
      status,
    } satisfies TaskDropTarget,
  });

  return (
    <Box ref={setNodeRef}>
      <DatabaseBoardColumn
        title={taskStatusLabels[status]}
        count={items.length}
        highlighted={isOver}
      >
        {items.length ? (
          items.map((task) => (
            <DraggableTaskCard
              key={task.id}
              task={task}
              showProjectContext={showProjectContext}
            />
          ))
        ) : (
          <DatabaseBoardEmptyState message="Nenhuma tarefa nesta coluna." />
        )}
      </DatabaseBoardColumn>
    </Box>
  );
}

function DraggableTaskCard({
  task,
  showProjectContext,
}: {
  task: TaskStatusBoardItem;
  showProjectContext: boolean;
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
        contextLabel={showProjectContext ? task.project.name : undefined}
      />
    </Box>
  );
}
