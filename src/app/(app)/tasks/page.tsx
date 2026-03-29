import { AddRounded } from "@mui/icons-material";
import { Box, Button, Stack, Typography } from "@mui/material";
import Link from "next/link";
import { SprintStatus, TaskStatus } from "@prisma/client";
import {
  DatabaseGroup,
  DatabaseListHeader,
  DatabaseRow,
  DatabaseSurface,
} from "@/components/database/database-list";
import { TaskSprintBoardsDnd } from "@/components/tasks/task-sprint-boards-dnd";
import { TaskStatusBoardDnd } from "@/components/tasks/task-status-board-dnd";
import { TaskStatusListDnd } from "@/components/tasks/task-status-list-dnd";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { TaskDrawer } from "@/components/ui/task-drawer";
import { AvatarStack } from "@/components/ui/avatar-stack";
import { TaskQuickCreateDialog } from "@/components/tasks/task-quick-create-dialog";
import { taskStatusLabels } from "@/lib/domain";
import { formatDate } from "@/lib/formatters";
import { requireUser } from "@/server/auth/session";
import {
  canCommentTask,
  canManageTask,
  isReadOnlyRole,
} from "@/server/permissions";
import { listTaskFormOptions } from "@/server/services/reference-data";
import { listVisibleTasks } from "@/server/services/workspace";

type TasksPageProps = {
  searchParams?: Promise<{
    view?: string;
    taskId?: string;
    composer?: string;
  }>;
};

const allowedViews = ["list", "board", "project", "sprint", "current"] as const;
const statusOrder = [
  "BACKLOG",
  "TODO",
  "IN_PROGRESS",
  "REVIEW",
  "DONE",
] as const satisfies readonly TaskStatus[];
const sprintStatusOrder = [
  "ACTIVE",
  "PLANNED",
  "COMPLETED",
] as const satisfies readonly SprintStatus[];

export default async function TasksPage({ searchParams }: TasksPageProps) {
  const user = await requireUser();
  const [tasks, taskFormOptions] = await Promise.all([
    listVisibleTasks(user),
    listTaskFormOptions(user),
  ]);
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const currentView = allowedViews.includes(
    (resolvedSearchParams?.view as (typeof allowedViews)[number]) ?? "list",
  )
    ? ((resolvedSearchParams?.view as (typeof allowedViews)[number]) ?? "list")
    : "list";
  const composerOpen = resolvedSearchParams?.composer === "new-task";
  const canCreateAnyTask =
    !isReadOnlyRole(user) && taskFormOptions.projects.length > 0;
  const selectedTask =
    tasks.find((task) => task.id === resolvedSearchParams?.taskId) ?? null;
  const selectedTaskAccess = selectedTask
    ? {
        creatorId: selectedTask.creatorId,
        visibility: selectedTask.visibility,
        assignees: selectedTask.assignees.map((assignee) => ({
          userId: assignee.userId,
        })),
        project: {
          visibility: selectedTask.project.visibility,
          ownerId: selectedTask.project.ownerId,
          members: selectedTask.project.members,
        },
      }
    : null;
  const selectedTaskCanManage = selectedTaskAccess
    ? canManageTask(user, selectedTaskAccess)
    : false;
  const selectedTaskCanComment = selectedTaskAccess
    ? canCommentTask(user, selectedTaskAccess)
    : false;

  const tabs = [
    { label: "Todas", value: "list", href: "/tasks?view=list", count: tasks.length },
    { label: "Quadro", value: "board", href: "/tasks?view=board", count: tasks.length },
    {
      label: "Por projeto",
      value: "project",
      href: "/tasks?view=project",
      count: tasks.length,
    },
    {
      label: "Sprints",
      value: "sprint",
      href: "/tasks?view=sprint",
      count: tasks.length,
    },
    {
      label: "Sprint atual",
      value: "current",
      href: "/tasks?view=current",
      count: tasks.filter((task) => task.sprint?.status === "ACTIVE").length,
    },
  ];

  return (
    <>
      <Stack spacing={3}>
        <PageHeader
          eyebrow="Tarefas"
          title="Database global de tarefas"
          description="Uma única base com múltiplas views para acompanhar execução por quadro, projeto, sprint e contexto atual, mantendo a task como detalhe contextual lateral."
          chips={["Database com views", "Drawer contextual", "Checklist central"]}
          actions={
            canCreateAnyTask ? (
              <Button
                component={Link}
                href={
                  composerOpen
                    ? `/tasks?view=${currentView}`
                    : `/tasks?view=${currentView}&composer=new-task`
                }
                variant="contained"
                startIcon={<AddRounded />}
              >
                {composerOpen ? "Fechar criação" : "Nova tarefa"}
              </Button>
            ) : null
          }
        >
          <SegmentedTabs value={currentView} items={tabs} />
        </PageHeader>

        {composerOpen && canCreateAnyTask ? (
          <TaskQuickCreateDialog
            cancelHref={`/tasks?view=${currentView}`}
            projects={taskFormOptions.projects.map((project) => ({
              id: project.id,
              name: project.name,
              sprints: project.sprints.map((sprint) => ({
                id: sprint.id,
                name: sprint.name,
              })),
            }))}
            users={taskFormOptions.users}
          />
        ) : null}

        {tasks.length ? (
          renderTasksView(currentView, tasks)
        ) : (
          <EmptyState message="Nenhuma tarefa visível para este usuário." />
        )}
      </Stack>

      <TaskDrawer
        task={selectedTask ? mapTaskToDrawerTask(selectedTask) : null}
        projects={taskFormOptions.projects.map((project) => ({
          id: project.id,
          name: project.name,
          sprints: project.sprints.map((sprint) => ({
            id: sprint.id,
            name: sprint.name,
          })),
        }))}
        users={taskFormOptions.users}
        canManage={selectedTaskCanManage}
        canComment={selectedTaskCanComment}
      />
    </>
  );
}

function renderTasksView(
  view: (typeof allowedViews)[number],
  tasks: Awaited<ReturnType<typeof listVisibleTasks>>,
) {
  if (view === "board") {
    return (
      <Stack spacing={1.5}>
        <ViewLead
          eyebrow="View"
          title="Quadro global"
          meta="Todas as tarefas do workspace distribuídas nas mesmas colunas da database."
        />
        <TaskStatusBoardDnd
          tasks={tasks.map((task) => toTaskDndBoardItem(task, `/tasks?view=board&taskId=${task.id}`))}
          showProjectContext
        />
      </Stack>
    );
  }

  if (view === "project") {
    const grouped = toSortedGroups(groupBy(tasks, (task) => task.project.name));

    return (
      <Stack spacing={1.5}>
        <ViewLead
          eyebrow="View"
          title="Agrupado por projeto"
          meta="Uma leitura contínua da database por frente de trabalho."
        />
        <DatabaseSurface>
          <DatabaseListHeader
            columns={{
              xs: "minmax(0, 1fr) auto",
              md: "minmax(0, 1.8fr) 140px 120px 120px",
            }}
          >
            <Box component="span">Tarefa</Box>
            <Box component="span" sx={{ display: { xs: "none", md: "block" } }}>
              Responsáveis
            </Box>
            <Box component="span" sx={{ display: { xs: "none", md: "block" } }}>
              Sprint
            </Box>
            <Box component="span">Prazo</Box>
          </DatabaseListHeader>

          {grouped.map(([projectName, items]) => (
            <DatabaseGroup key={projectName} title={projectName} count={items.length}>
              {items.map((task) => (
                <DatabaseRow
                  key={task.id}
                  href={`/tasks?view=project&taskId=${task.id}`}
                  columns={{
                    xs: "minmax(0, 1fr) auto",
                    md: "minmax(0, 1.8fr) 140px 120px 120px",
                  }}
                >
                  <TaskTitleCell
                    title={task.title}
                    summary={`${task.code} • ${task.summary ?? "Sem resumo"}`}
                    mobileMeta={<>{task.sprint?.name ?? "Sem sprint"}</>}
                  />
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
                  <Typography color="text.secondary" variant="body2">
                    {formatDate(task.dueDate)}
                  </Typography>
                </DatabaseRow>
              ))}
            </DatabaseGroup>
          ))}
        </DatabaseSurface>
      </Stack>
    );
  }

  if (view === "current") {
    const currentSprintTasks = tasks.filter((task) => task.sprint?.status === "ACTIVE");

    if (!currentSprintTasks.length) {
      return (
        <EmptyState
          title="Sem tarefas nesta view"
          message="Nenhuma tarefa vinculada à sprint ativa agora."
        />
      );
    }

    return (
      <Stack spacing={1.5}>
        <ViewLead
          eyebrow="View"
          title="Sprint atual"
          meta="Quadro focado na janela ativa de execução, distribuindo as tarefas por status."
        />
        <TaskStatusBoardDnd
          tasks={currentSprintTasks.map((task) =>
            toTaskDndBoardItem(task, `/tasks?view=current&taskId=${task.id}`),
          )}
          showProjectContext
        />
      </Stack>
    );
  }

  if (view === "sprint") {
    const sprintGroups = Array.from(
      tasks.reduce<
        Map<
          string,
          {
            id: string;
            name: string;
            status: SprintStatus;
            items: typeof tasks;
          }
        >
      >((groups, task) => {
        if (!task.sprint) {
          return groups;
        }

        const current = groups.get(task.sprint.id) ?? {
          id: task.sprint.id,
          name: task.sprint.name,
          status: task.sprint.status,
          items: [],
        };

        current.items.push(task);
        groups.set(task.sprint.id, current);
        return groups;
      }, new Map()),
    )
      .map(([, group]) => group)
      .sort(
        (left, right) =>
          sprintStatusOrder.indexOf(left.status) - sprintStatusOrder.indexOf(right.status) ||
          left.name.localeCompare(right.name),
      );

    if (!sprintGroups.length) {
      return (
        <EmptyState
          title="Sem tarefas nesta view"
          message="Nenhuma tarefa vinculada a uma sprint no momento."
        />
      );
    }

    return (
      <Stack spacing={1.5}>
        <ViewLead
          eyebrow="View"
          title="Quadros por sprint"
          meta="Cada sprint pode ser aberta ou fechada, mantendo um quadro próprio distribuído por status."
        />
        <TaskSprintBoardsDnd
          tasks={tasks
            .filter((task) => task.sprint)
            .map((task) => toTaskDndBoardItem(task, `/tasks?view=sprint&taskId=${task.id}`))}
          sprints={sprintGroups.map((group) => ({
            id: group.id,
            name: group.name,
            status: group.status,
            projectId: group.items[0]?.project.id ?? "",
          }))}
        />
      </Stack>
    );
  }

  return (
    <Stack spacing={1.5}>
      <ViewLead
        eyebrow="View"
        title="Todas as tarefas"
        meta="Uma leitura silenciosa da database completa, agrupada por status."
      />
      <TaskStatusListDnd
        tasks={tasks.map((task) => toTaskDndListItem(task, `/tasks?view=list&taskId=${task.id}`))}
        variant="workspace"
      />
    </Stack>
  );
}

function toTaskDndBoardItem(
  task: Awaited<ReturnType<typeof listVisibleTasks>>[number],
  href: string,
) {
  return {
    id: task.id,
    href,
    code: task.code,
    title: task.title,
    summary: task.summary,
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate?.toISOString() ?? null,
    project: {
      id: task.project.id,
      name: task.project.name,
    },
    sprint: task.sprint
      ? {
          id: task.sprint.id,
          name: task.sprint.name,
          status: task.sprint.status,
        }
      : null,
    assignees: task.assignees.map((assignee) => ({
      user: {
        id: assignee.user.id,
        name: assignee.user.name,
        avatarColor: assignee.user.avatarColor,
      },
    })),
    tags: task.tags.map((tagItem) => ({
      tag: {
        id: tagItem.tag.id,
        name: tagItem.tag.name,
        color: tagItem.tag.color,
      },
    })),
  };
}

function toTaskDndListItem(
  task: Awaited<ReturnType<typeof listVisibleTasks>>[number],
  href: string,
) {
  return {
    id: task.id,
    href,
    code: task.code,
    title: task.title,
    summary: task.summary,
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate?.toISOString() ?? null,
    project: {
      id: task.project.id,
      name: task.project.name,
    },
    sprint: task.sprint
      ? {
          id: task.sprint.id,
          name: task.sprint.name,
        }
      : null,
    assignees: task.assignees.map((assignee) => ({
      user: {
        id: assignee.user.id,
        name: assignee.user.name,
        avatarColor: assignee.user.avatarColor,
      },
    })),
  };
}

function mapTaskToDrawerTask(
  task: Awaited<ReturnType<typeof listVisibleTasks>>[number],
) {
  return {
    id: task.id,
    code: task.code,
    title: task.title,
    summary: task.summary,
    description: task.description,
    status: task.status,
    priority: task.priority,
    type: task.type,
    visibility: task.visibility,
    blocked: task.blocked,
    dueDate: task.dueDate?.toISOString() ?? null,
    startDate: task.startDate?.toISOString() ?? null,
    sprintId: task.sprint?.id ?? null,
    sprintName: task.sprint?.name ?? null,
    projectId: task.project.id,
    projectName: task.project.name,
    assignees: task.assignees.map((assignee) => ({
      id: assignee.user.id,
      name: assignee.user.name,
      avatarColor: assignee.user.avatarColor,
    })),
    checklistItems: task.checklistItems.map((item) => ({
      id: item.id,
      content: item.content,
      done: item.done,
    })),
    comments: task.comments.map((comment) => ({
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt.toISOString(),
      author: {
        id: comment.author.id,
        name: comment.author.name,
        avatarColor: comment.author.avatarColor,
      },
    })),
    tags: task.tags.map((tagItem) => ({
      id: tagItem.tag.id,
      name: tagItem.tag.name,
      color: tagItem.tag.color,
    })),
  };
}

function groupBy<T>(items: T[], getKey: (item: T) => string) {
  return items.reduce<Record<string, T[]>>((groups, item) => {
    const key = getKey(item);
    groups[key] = [...(groups[key] ?? []), item];
    return groups;
  }, {});
}

function toSortedGroups<T>(groups: Record<string, T[]>) {
  return Object.entries(groups).sort(([left], [right]) => left.localeCompare(right));
}

function TaskTitleCell({
  title,
  summary,
  mobileMeta,
}: {
  title: string;
  summary: string;
  mobileMeta?: React.ReactNode;
}) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography fontWeight={700}>{title}</Typography>
      <Typography color="text.secondary" variant="body2" noWrap>
        {summary}
      </Typography>
      {mobileMeta ? (
        <Typography
          color="text.secondary"
          variant="caption"
          sx={{ display: { xs: "block", md: "none" }, mt: 0.45 }}
        >
          {mobileMeta}
        </Typography>
      ) : null}
    </Box>
  );
}

function ViewLead({
  eyebrow,
  title,
  meta,
}: {
  eyebrow: string;
  title: string;
  meta: string;
}) {
  return (
    <Stack spacing={0.35} sx={{ px: 0.5 }}>
      <Typography
        variant="overline"
        sx={{ color: "secondary.main", letterSpacing: "0.14em" }}
      >
        {eyebrow}
      </Typography>
      <Typography variant="h3" sx={{ fontSize: "1.1rem" }}>
        {title}
      </Typography>
      <Typography color="text.secondary" variant="body2">
        {meta}
      </Typography>
    </Stack>
  );
}
