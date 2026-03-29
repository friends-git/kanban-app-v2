import { AddRounded } from "@mui/icons-material";
import {
  Box,
  Button,
  Stack,
  Typography,
} from "@mui/material";
import Link from "next/link";
import { notFound } from "next/navigation";
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
import { ProjectTaskComposer } from "@/components/tasks/project-task-composer";
import { AvatarStack } from "@/components/ui/avatar-stack";
import { EmptyState } from "@/components/ui/empty-state";
import { EntityCard } from "@/components/ui/entity-card";
import { PageHeader } from "@/components/ui/page-header";
import { ProjectPropertiesPanel } from "@/components/ui/project-properties-panel";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { StatusBadge } from "@/components/ui/status-badge";
import { TaskCard } from "@/components/ui/task-card";
import { TaskDrawer } from "@/components/ui/task-drawer";
import { formatFullDate } from "@/lib/formatters";
import { requireUser } from "@/server/auth/session";
import {
  canCommentTask,
  canCreateTask,
  canManageProject,
  canManageTask,
} from "@/server/permissions";
import {
  listProjectFormOptions,
  listTaskFormOptions,
} from "@/server/services/reference-data";
import { getProjectDetail } from "@/server/services/workspace";

type ProjectDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    taskView?: string;
    taskId?: string;
    composer?: string;
  }>;
};

const allowedViews = ["board", "list"] as const;

export default async function ProjectDetailPage({
  params,
  searchParams,
}: ProjectDetailPageProps) {
  const user = await requireUser();
  const { id } = await params;
  const project = await getProjectDetail(id, user);

  if (!project) {
    notFound();
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const taskView = allowedViews.includes(
    (resolvedSearchParams?.taskView as (typeof allowedViews)[number]) ?? "board",
  )
    ? ((resolvedSearchParams?.taskView as (typeof allowedViews)[number]) ?? "board")
    : "board";
  const selectedTask = project.tasks.find((task) => task.id === resolvedSearchParams?.taskId) ?? null;
  const composerOpen = resolvedSearchParams?.composer === "new-task";
  const projectAccess = {
    visibility: project.visibility,
    ownerId: project.ownerId,
    members: project.members.map((member) => ({
      userId: member.userId,
      role: member.role,
    })),
  };
  const canManageCurrentProject = canManageProject(user, projectAccess);
  const canCreateTasks = canCreateTask(user, projectAccess);
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
  const [projectFormOptions, taskFormOptions] = await Promise.all([
    canManageCurrentProject ? listProjectFormOptions() : Promise.resolve(null),
    canCreateTasks || selectedTask ? listTaskFormOptions(user) : Promise.resolve(null),
  ]);

  const taskTabs = [
    {
      label: "Quadro",
      value: "board",
      href: `/projects/${project.id}?taskView=board`,
      count: project.tasks.length,
    },
    {
      label: "Lista",
      value: "list",
      href: `/projects/${project.id}?taskView=list`,
      count: project.tasks.length,
    },
  ];

  return (
    <>
      <Stack spacing={3}>
        <PageHeader
          eyebrow="Projeto"
          title={project.name}
          description={project.description ?? project.summary}
          chips={[
            project.team?.name ?? "Workspace",
            `${project.tasks.length} tarefas`,
            `${project.sprints.length} sprints`,
          ]}
          actions={
            canCreateTasks ? (
              <Button
                component={Link}
                href={composerOpen ? `/projects/${project.id}?taskView=${taskView}` : `/projects/${project.id}?taskView=${taskView}&composer=new-task`}
                variant="contained"
                startIcon={<AddRounded />}
              >
                {composerOpen ? "Fechar criação" : "Nova tarefa"}
              </Button>
            ) : null
          }
        />

        <ProjectPropertiesPanel
          project={project}
          users={projectFormOptions?.users ?? []}
          teams={projectFormOptions?.teams ?? []}
          canManage={canManageCurrentProject}
        />

        <Box
          sx={{
            display: "grid",
            gap: 3,
            gridTemplateColumns: { xs: "1fr", xl: "1.35fr 0.65fr" },
          }}
        >
          <Stack spacing={3}>
            <EntityCard
              eyebrow="Resumo"
              title="Contexto do projeto"
              description="Uma página rica para manter intenção, contexto e próximos movimentos do desenvolvimento."
            >
              <Typography color="text.secondary">
                {project.description ??
                  "Este projeto ainda não tem uma descrição expandida. A base foi preparada para que o topo da página concentre propriedades, descrição e as tarefas relacionadas sem depender de um modelo enterprise."}
              </Typography>
            </EntityCard>

            <EntityCard
              eyebrow="Database embutida"
              title="Tarefas relacionadas"
              description="A base de execução deste projeto alterna entre quadro e lista sem perder o contexto da página."
              actions={
                canCreateTasks ? (
                  <Button
                    component={Link}
                    href={
                      composerOpen
                        ? `/projects/${project.id}?taskView=${taskView}`
                        : `/projects/${project.id}?taskView=${taskView}&composer=new-task`
                    }
                    variant="contained"
                    size="small"
                  >
                    {composerOpen ? "Fechar criação" : "Nova tarefa"}
                  </Button>
                ) : null
              }
            >
              {composerOpen && canCreateTasks && taskFormOptions ? (
                <ProjectTaskComposer
                  cancelHref={`/projects/${project.id}?taskView=${taskView}`}
                  openTaskHref={(taskId) =>
                    `/projects/${project.id}?taskView=${taskView}&taskId=${taskId}`
                  }
                  project={{
                    id: project.id,
                    sprints: project.sprints.map((sprint) => ({
                      id: sprint.id,
                      name: sprint.name,
                    })),
                  }}
                  users={taskFormOptions.users}
                />
              ) : null}

              <SegmentedTabs value={taskView} items={taskTabs} />

              {taskView === "board" ? (
                project.board?.columns.length ? (
                  <DatabaseBoard>
                    {project.board.columns.map((column) => (
                      <DatabaseBoardColumn
                        key={column.id}
                        title={column.name}
                        count={column.tasks.length}
                      >
                        {column.tasks.length ? (
                          column.tasks.map((task) => (
                            <TaskCard
                              key={task.id}
                              task={task}
                              href={`/projects/${project.id}?taskView=board&taskId=${task.id}`}
                            />
                          ))
                        ) : (
                          <DatabaseBoardEmptyState message="Sem tarefas nesta coluna." />
                        )}
                      </DatabaseBoardColumn>
                    ))}
                  </DatabaseBoard>
                ) : (
                  <EmptyState message="O quadro deste projeto ainda não foi configurado." />
                )
              ) : project.tasks.length ? (
                <DatabaseSurface>
                  <DatabaseListHeader
                    columns={{
                      xs: "minmax(0, 1fr) auto",
                      md: "minmax(0, 1.7fr) 140px 120px 120px",
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

                  {project.board?.columns.map((column) => {
                    const items = project.tasks.filter(
                      (task) => task.status === column.taskStatus,
                    );

                    return (
                      <DatabaseGroup
                        key={column.id}
                        title={column.name}
                        count={items.length}
                        defaultExpanded={column.taskStatus !== "DONE"}
                      >
                        {items.length ? (
                          items.map((task) => (
                            <DatabaseRow
                              key={task.id}
                              href={`/projects/${project.id}?taskView=list&taskId=${task.id}`}
                              columns={{
                                xs: "minmax(0, 1fr) auto",
                                md: "minmax(0, 1.7fr) 140px 120px 120px",
                              }}
                            >
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
                                  {task.sprint?.name ?? "Sem sprint"}
                                </Typography>
                              </Box>

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
                                {formatFullDate(task.dueDate)}
                              </Typography>
                            </DatabaseRow>
                          ))
                        ) : (
                          <Box sx={{ px: 2, py: 1.5 }}>
                            <Typography color="text.secondary" variant="body2">
                              Nenhuma tarefa neste grupo.
                            </Typography>
                          </Box>
                        )}
                      </DatabaseGroup>
                    );
                  })}
                </DatabaseSurface>
              ) : (
                <EmptyState message="Nenhuma tarefa visível neste projeto." />
              )}
            </EntityCard>
          </Stack>

          <Stack spacing={3}>
            <EntityCard
              eyebrow="Equipe"
              title="Pessoas conectadas"
              description="Participantes e papéis da página do projeto."
            >
              <AvatarStack
                max={6}
                items={project.members.map((member) => ({
                  id: member.user.id,
                  name: member.user.name,
                  avatarColor: member.user.avatarColor,
                }))}
              />
              <Stack spacing={1.25}>
                {project.members.map((member) => (
                  <Box
                    key={member.id}
                    sx={{
                      p: 1.5,
                      borderRadius: 4,
                      border: "1px solid",
                      borderColor: "divider",
                      bgcolor: "action.hover",
                    }}
                  >
                    <Stack direction="row" justifyContent="space-between" spacing={1}>
                      <Box>
                        <Typography fontWeight={700}>{member.user.name}</Typography>
                        <Typography color="text.secondary" variant="body2">
                          {member.user.title ?? "Workspace"}
                        </Typography>
                      </Box>
                      <StatusBadge status={member.user.role} />
                    </Stack>
                  </Box>
                ))}
              </Stack>
            </EntityCard>

            <EntityCard
              eyebrow="Planejamento"
              title="Sprints conectadas"
              description="Marcos e janelas ativas deste projeto."
            >
              <Stack spacing={1.25}>
                {project.sprints.map((sprint) => (
                  <Box
                    key={sprint.id}
                    sx={{
                      p: 1.5,
                      borderRadius: 4,
                      border: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    <Stack spacing={0.75}>
                      <Stack direction="row" justifyContent="space-between" spacing={1}>
                        <Typography fontWeight={700}>{sprint.name}</Typography>
                        <StatusBadge status={sprint.status} />
                      </Stack>
                      <Typography color="text.secondary" variant="body2">
                        {sprint.goal}
                      </Typography>
                      <Typography color="text.secondary" variant="caption">
                        {formatFullDate(sprint.startDate)} até {formatFullDate(sprint.endDate)} •{" "}
                        {sprint._count.tasks} tarefas
                      </Typography>
                    </Stack>
                  </Box>
                ))}
              </Stack>
            </EntityCard>
          </Stack>
        </Box>
      </Stack>

      <TaskDrawer
        task={
          selectedTask
            ? {
                id: selectedTask.id,
                code: selectedTask.code,
                title: selectedTask.title,
                summary: selectedTask.summary,
                description: selectedTask.description,
                status: selectedTask.status,
                priority: selectedTask.priority,
                type: selectedTask.type,
                visibility: selectedTask.visibility,
                blocked: selectedTask.blocked,
                dueDate: selectedTask.dueDate?.toISOString() ?? null,
                startDate: selectedTask.startDate?.toISOString() ?? null,
                sprintId: selectedTask.sprint?.id ?? null,
                sprintName: selectedTask.sprint?.name ?? null,
                projectId: selectedTask.project.id,
                projectName: project.name,
                assignees: selectedTask.assignees.map((assignee) => ({
                  id: assignee.user.id,
                  name: assignee.user.name,
                  avatarColor: assignee.user.avatarColor,
                })),
                checklistItems: selectedTask.checklistItems.map((item) => ({
                  id: item.id,
                  content: item.content,
                  done: item.done,
                })),
                comments: selectedTask.comments.map((comment) => ({
                  id: comment.id,
                  content: comment.content,
                  createdAt: comment.createdAt.toISOString(),
                  author: {
                    id: comment.author.id,
                    name: comment.author.name,
                    avatarColor: comment.author.avatarColor,
                  },
                })),
                tags: selectedTask.tags.map((tagItem) => ({
                  id: tagItem.tag.id,
                  name: tagItem.tag.name,
                  color: tagItem.tag.color,
                })),
              }
            : null
        }
        projects={
          taskFormOptions?.projects.map((projectOption) => ({
            id: projectOption.id,
            name: projectOption.name,
            sprints: projectOption.sprints.map((sprint) => ({
              id: sprint.id,
              name: sprint.name,
            })),
          })) ?? []
        }
        users={taskFormOptions?.users ?? []}
        canManage={selectedTaskCanManage}
        canComment={selectedTaskCanComment}
      />
    </>
  );
}
