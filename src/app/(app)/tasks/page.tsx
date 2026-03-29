import { AddRounded } from "@mui/icons-material";
import { Box, Button, Stack, Typography } from "@mui/material";
import Link from "next/link";
import { TaskStatus } from "@prisma/client";
import {
  DatabaseBoard,
  DatabaseBoardColumn,
  DatabaseBoardEmptyState,
} from "@/components/database/database-board";
import {
  DatabaseGroup,
  DatabaseListHeader,
  DatabaseRow,
  DatabaseSurface,
} from "@/components/database/database-list";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { TaskCard } from "@/components/ui/task-card";
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
    const grouped = statusOrder.map((status) => ({
      key: status,
      title: taskStatusLabels[status],
      items: tasks.filter((task) => task.status === status),
    }));

    return (
      <Stack spacing={1.5}>
        <ViewLead
          eyebrow="View"
          title="Quadro global"
          meta="Todas as tarefas do workspace distribuídas nas mesmas colunas da database."
        />
        <DatabaseBoard>
          {grouped.map((column) => (
            <DatabaseBoardColumn
              key={column.key}
              title={column.title}
              count={column.items.length}
            >
              {column.items.length ? (
                column.items.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    href={`/tasks?view=board&taskId=${task.id}`}
                    contextLabel={task.project.name}
                  />
                ))
              ) : (
                <DatabaseBoardEmptyState message="Nenhuma tarefa nesta coluna." />
              )}
            </DatabaseBoardColumn>
          ))}
        </DatabaseBoard>
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

  if (view === "sprint" || view === "current") {
    const baseTasks =
      view === "current"
        ? tasks.filter((task) => task.sprint?.status === "ACTIVE")
        : tasks;

    if (!baseTasks.length) {
      return (
        <EmptyState
          title="Sem tarefas nesta view"
          message={
            view === "current"
              ? "Nenhuma tarefa vinculada à sprint ativa agora."
              : "Nenhuma tarefa agrupável por sprint."
          }
        />
      );
    }

    const grouped = toSortedGroups(
      groupBy(baseTasks, (task) => task.sprint?.name ?? "Sem sprint"),
    );

    return (
      <Stack spacing={1.5}>
        <ViewLead
          eyebrow="View"
          title={view === "current" ? "Sprint atual" : "Agrupado por sprint"}
          meta={
            view === "current"
              ? "Foco total na janela ativa de execução."
              : "Leitura da database organizada por ciclos."
          }
        />
        <DatabaseSurface>
          <DatabaseListHeader
            columns={{
              xs: "minmax(0, 1fr) auto",
              md: "minmax(0, 1.8fr) 150px 120px 120px",
            }}
          >
            <Box component="span">Tarefa</Box>
            <Box component="span" sx={{ display: { xs: "none", md: "block" } }}>
              Projeto
            </Box>
            <Box component="span" sx={{ display: { xs: "none", md: "block" } }}>
              Status
            </Box>
            <Box component="span">Prazo</Box>
          </DatabaseListHeader>

          {grouped.map(([sprintName, items]) => (
            <DatabaseGroup key={sprintName} title={sprintName} count={items.length}>
              {items.map((task) => (
                <DatabaseRow
                  key={task.id}
                  href={`/tasks?view=${view}&taskId=${task.id}`}
                  columns={{
                    xs: "minmax(0, 1fr) auto",
                    md: "minmax(0, 1.8fr) 150px 120px 120px",
                  }}
                >
                  <TaskTitleCell
                    title={task.title}
                    summary={`${task.code} • ${task.summary ?? "Sem resumo"}`}
                    mobileMeta={<>{task.project.name}</>}
                  />
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
                    {taskStatusLabels[task.status]}
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

  const grouped = statusOrder
    .map((status) => ({
      key: status,
      title: taskStatusLabels[status],
      items: tasks.filter((task) => task.status === status),
    }))
    .filter((group) => group.items.length);

  return (
    <Stack spacing={1.5}>
      <ViewLead
        eyebrow="View"
        title="Todas as tarefas"
        meta="Uma leitura silenciosa da database completa, agrupada por status."
      />
      <DatabaseSurface>
        <DatabaseListHeader
          columns={{
            xs: "minmax(0, 1fr) auto",
            md: "minmax(0, 1.9fr) 150px 120px 120px 120px",
          }}
        >
          <Box component="span">Tarefa</Box>
          <Box component="span" sx={{ display: { xs: "none", md: "block" } }}>
            Projeto
          </Box>
          <Box component="span" sx={{ display: { xs: "none", md: "block" } }}>
            Sprint
          </Box>
          <Box component="span" sx={{ display: { xs: "none", md: "block" } }}>
            Responsáveis
          </Box>
          <Box component="span">Prazo</Box>
        </DatabaseListHeader>

        {grouped.map((group) => (
          <DatabaseGroup
            key={group.key}
            title={group.title}
            count={group.items.length}
            defaultExpanded={group.key !== "DONE"}
          >
            {group.items.map((task) => (
              <DatabaseRow
                key={task.id}
                href={`/tasks?view=list&taskId=${task.id}`}
                columns={{
                  xs: "minmax(0, 1fr) auto",
                  md: "minmax(0, 1.9fr) 150px 120px 120px 120px",
                }}
              >
                <TaskTitleCell
                  title={task.title}
                  summary={`${task.code} • ${task.summary ?? "Sem resumo"}`}
                  mobileMeta={
                    <>
                      {task.project.name}
                      {task.sprint ? ` • ${task.sprint.name}` : ""}
                    </>
                  }
                />
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
