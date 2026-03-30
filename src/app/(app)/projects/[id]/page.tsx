import { AddRounded } from "@mui/icons-material";
import {
  Box,
  Button,
  Stack,
  Typography,
} from "@mui/material";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FlowModulePage } from "@/components/flowcharts/flow-module-page";
import { ProjectTaskComposer } from "@/components/tasks/project-task-composer";
import { TaskStatusBoardDnd } from "@/components/tasks/task-status-board-dnd";
import { TaskStatusListDnd } from "@/components/tasks/task-status-list-dnd";
import { AvatarStack } from "@/components/ui/avatar-stack";
import { EmptyState } from "@/components/ui/empty-state";
import { EntityCard } from "@/components/ui/entity-card";
import { PageHeader } from "@/components/ui/page-header";
import { ProjectPropertiesPanel } from "@/components/ui/project-properties-panel";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { StatusBadge } from "@/components/ui/status-badge";
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
import { getFlowchartDetail } from "@/server/services/flowcharts";
import { getProjectDetail, mapTaskRecordToDetailData } from "@/server/services/workspace";

type ProjectDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    taskView?: string;
    taskId?: string;
    composer?: string;
    section?: string;
    flowView?: string;
    diagramId?: string;
  }>;
};

const allowedViews = ["board", "list"] as const;
const allowedSections = ["overview", "flows"] as const;
const allowedFlowViews = ["auto", "manual"] as const;

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
  const currentSection = allowedSections.includes(
    (resolvedSearchParams?.section as (typeof allowedSections)[number]) ?? "overview",
  )
    ? ((resolvedSearchParams?.section as (typeof allowedSections)[number]) ?? "overview")
    : "overview";
  const flowView = allowedFlowViews.includes(
    (resolvedSearchParams?.flowView as (typeof allowedFlowViews)[number]) ?? "auto",
  )
    ? ((resolvedSearchParams?.flowView as (typeof allowedFlowViews)[number]) ?? "auto")
    : "auto";
  const selectedDiagramSummary =
    flowView === "manual"
      ? project.flowcharts.find((flowchart) => flowchart.id === resolvedSearchParams?.diagramId) ??
        project.flowcharts[0] ??
        null
      : null;
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
  const [projectFormOptions, taskFormOptions, selectedFlowchartDetail] = await Promise.all([
    canManageCurrentProject ? listProjectFormOptions() : Promise.resolve(null),
    canCreateTasks || selectedTask ? listTaskFormOptions(user) : Promise.resolve(null),
    selectedDiagramSummary ? getFlowchartDetail(selectedDiagramSummary.id, user) : Promise.resolve(null),
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
  const sectionTabs = [
    {
      label: "Visão geral",
      value: "overview",
      href: buildProjectHref(project.id, {
        section: "overview",
        taskView,
        taskId: resolvedSearchParams?.taskId,
      }),
    },
    {
      label: "Fluxos",
      value: "flows",
      href: buildProjectHref(project.id, {
        section: "flows",
        flowView,
        taskId: flowView === "auto" ? resolvedSearchParams?.taskId : undefined,
        diagramId: selectedDiagramSummary?.id,
      }),
      count: project.flowcharts.length + project.tasks.filter((task) => task.dependencies.length).length,
    },
  ];
  const flowTabs = [
    {
      label: "Fluxo automático",
      value: "auto",
      href: buildProjectHref(project.id, {
        section: "flows",
        flowView: "auto",
        taskId: resolvedSearchParams?.taskId,
        diagramId: selectedDiagramSummary?.id,
      }),
      count: project.tasks.length,
    },
    {
      label: "Diagramas",
      value: "manual",
      href: buildProjectHref(project.id, {
        section: "flows",
        flowView: "manual",
        taskId: undefined,
        diagramId: selectedDiagramSummary?.id,
      }),
      count: project.flowcharts.length,
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
            project.team?.name ?? "Grupo do TCC",
            `${project.tasks.length} tarefas`,
            `${project.sprints.length} sprints`,
          ]}
          actions={
            currentSection === "overview" && canCreateTasks ? (
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
        >
          <SegmentedTabs value={currentSection} items={sectionTabs} />
        </PageHeader>

        <ProjectPropertiesPanel
          project={project}
          users={projectFormOptions?.users ?? []}
          teams={projectFormOptions?.teams ?? []}
          canManage={canManageCurrentProject}
        />

        {currentSection === "overview" ? (
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
                description="Objetivo, escopo e contexto desta frente do TCC."
              >
                <Typography color="text.secondary">
                  {project.description ??
                    "Adicione um resumo para registrar o objetivo do projeto, o que precisa ser entregue e os próximos passos."}
                </Typography>
              </EntityCard>

              <EntityCard
                eyebrow="Execução"
                title="Tarefas do projeto"
                description="Acompanhe o andamento das tarefas em quadro ou lista sem sair desta página."
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
                    project={{
                      id: project.id,
                      sprints: project.sprints.map((sprint) => ({
                        id: sprint.id,
                        name: sprint.name,
                      })),
                      tasks: project.tasks.map((task) => ({
                        id: task.id,
                        code: task.code,
                        title: task.title,
                      })),
                    }}
                    users={taskFormOptions.users}
                  />
                ) : null}

                <SegmentedTabs value={taskView} items={taskTabs} />

                {taskView === "board" ? (
                  project.board?.columns.length ? (
                    <TaskStatusBoardDnd
                      tasks={project.tasks.map((task) =>
                        toProjectTaskBoardItem(
                          task,
                          `/projects/${project.id}?taskView=board&taskId=${task.id}`,
                        ),
                      )}
                    />
                  ) : (
                    <EmptyState message="Este projeto ainda não tem colunas de acompanhamento." />
                  )
                ) : project.tasks.length ? (
                  <TaskStatusListDnd
                    tasks={project.tasks.map((task) =>
                      toProjectTaskListItem(
                        task,
                        `/projects/${project.id}?taskView=list&taskId=${task.id}`,
                      ),
                    )}
                    variant="project"
                  />
                ) : (
                  <EmptyState message="Nenhuma tarefa visível neste projeto no momento." />
                )}
              </EntityCard>
            </Stack>

            <Stack spacing={3}>
              <EntityCard
                eyebrow="Equipe"
                title="Pessoas conectadas"
                description="Pessoas envolvidas e papéis desta frente do TCC."
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
                            {member.user.title ?? "Grupo do TCC"}
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
                description="Ciclos e marcos que organizam a execução deste projeto."
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
                          {sprint.goal ?? "Objetivo ainda não definido"}
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
        ) : (
          <FlowModulePage
            projectId={project.id}
            currentMode={flowView}
            tabs={flowTabs}
            canManage={canManageCurrentProject}
            auto={{
              tasks: project.tasks.map((task) => ({
                id: task.id,
                code: task.code,
                title: task.title,
                status: task.status,
                blocked: task.blocked,
                sprint: task.sprint
                  ? {
                      id: task.sprint.id,
                      name: task.sprint.name,
                      status: task.sprint.status,
                    }
                  : null,
                assignees: task.assignees.map((assignee) => ({
                  id: assignee.user.id,
                  name: assignee.user.name,
                  avatarColor: assignee.user.avatarColor,
                })),
                dependencies: task.dependencies.map((dependency) => ({
                  dependsOnTaskId: dependency.dependsOnTaskId,
                })),
              })),
              selectedTaskId: selectedTask?.id ?? null,
              selectedTask: selectedTask
                ? {
                    id: selectedTask.id,
                    code: selectedTask.code,
                    title: selectedTask.title,
                    status: selectedTask.status,
                    blocked: selectedTask.blocked,
                    sprintName: selectedTask.sprint?.name ?? null,
                    dependencyTitles: selectedTask.dependencies.map(
                      (dependency) => dependency.dependsOnTask.title,
                    ),
                    assigneeNames: selectedTask.assignees.map((assignee) => assignee.user.name),
                  }
                : null,
            }}
            manual={{
              selectedDiagramId: selectedDiagramSummary?.id ?? null,
              selectedFlowchart: selectedFlowchartDetail
                ? {
                    id: selectedFlowchartDetail.id,
                    name: selectedFlowchartDetail.name,
                    description: selectedFlowchartDetail.description,
                    scopeType: selectedFlowchartDetail.scopeType,
                    canManage: selectedFlowchartDetail.canManage,
                    updatedAt: selectedFlowchartDetail.updatedAt.toISOString(),
                    project: selectedFlowchartDetail.project,
                    task: selectedFlowchartDetail.task,
                    content: selectedFlowchartDetail.content,
                  }
                : null,
              flowcharts: project.flowcharts.map((flowchart) => ({
                id: flowchart.id,
                name: flowchart.name,
                description: flowchart.description,
                updatedAt: flowchart.updatedAt.toISOString(),
                createdBy: flowchart.createdBy
                  ? {
                      name: flowchart.createdBy.name,
                    }
                  : null,
                href: buildProjectHref(project.id, {
                  section: "flows",
                  flowView: "manual",
                  taskId: undefined,
                  diagramId: flowchart.id,
                }),
                openHref: `/flowcharts/${flowchart.id}`,
              })),
              createRedirectBaseHref: buildProjectHref(project.id, {
                section: "flows",
                flowView: "manual",
                taskId: undefined,
              }),
            }}
          />
        )}
      </Stack>

      <TaskDrawer
        task={selectedTask ? mapTaskRecordToDetailData(selectedTask) : null}
        projects={
          taskFormOptions?.projects.map((projectOption) => ({
            id: projectOption.id,
            name: projectOption.name,
            sprints: projectOption.sprints.map((sprint) => ({
              id: sprint.id,
              name: sprint.name,
            })),
            tasks: projectOption.tasks.map((task) => ({
              id: task.id,
              code: task.code,
              title: task.title,
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

function buildProjectHref(
  projectId: string,
  params: {
    section?: (typeof allowedSections)[number];
    taskView?: (typeof allowedViews)[number];
    flowView?: (typeof allowedFlowViews)[number];
    taskId?: string;
    diagramId?: string;
  },
) {
  const nextParams = new URLSearchParams();

  if (params.section && params.section !== "overview") {
    nextParams.set("section", params.section);
  }

  if (params.taskView && params.taskView !== "board") {
    nextParams.set("taskView", params.taskView);
  }

  if (params.flowView && params.flowView !== "auto") {
    nextParams.set("flowView", params.flowView);
  }

  if (params.taskId) {
    nextParams.set("taskId", params.taskId);
  }

  if (params.diagramId) {
    nextParams.set("diagramId", params.diagramId);
  }

  const query = nextParams.toString();

  return query ? `/projects/${projectId}?${query}` : `/projects/${projectId}`;
}

function toProjectTaskBoardItem(
  task: NonNullable<Awaited<ReturnType<typeof getProjectDetail>>>["tasks"][number],
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

function toProjectTaskListItem(
  task: NonNullable<Awaited<ReturnType<typeof getProjectDetail>>>["tasks"][number],
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
