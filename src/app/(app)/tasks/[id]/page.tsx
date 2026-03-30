import {
  ArrowBackRounded,
  FolderOpenRounded,
} from "@mui/icons-material";
import {
  Box,
  Button,
  Stack,
  Typography,
} from "@mui/material";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TaskDetailContent } from "@/components/tasks/task-detail-content";
import { AvatarStack } from "@/components/ui/avatar-stack";
import { EntityCard } from "@/components/ui/entity-card";
import { PageHeader } from "@/components/ui/page-header";
import { PriorityBadge } from "@/components/ui/priority-badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatFullDate, formatRelativeDate } from "@/lib/formatters";
import { requireUser } from "@/server/auth/session";
import { canCommentTask, canManageTask } from "@/server/permissions";
import { listTaskFormOptions } from "@/server/services/reference-data";
import {
  getTaskDetail,
  mapTaskRecordToDetailData,
} from "@/server/services/workspace";

type TaskDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function TaskDetailPage({ params }: TaskDetailPageProps) {
  const user = await requireUser();
  const { id } = await params;
  const [task, taskFormOptions] = await Promise.all([
    getTaskDetail(id, user),
    listTaskFormOptions(user),
  ]);

  if (!task) {
    notFound();
  }

  const taskDetail = mapTaskRecordToDetailData(task);
  const taskAccess = {
    creatorId: task.creatorId,
    visibility: task.visibility,
    assignees: task.assignees.map((assignee) => ({
      userId: assignee.userId,
    })),
    project: {
      visibility: task.project.visibility,
      ownerId: task.project.ownerId,
      members: task.project.members,
    },
  };
  const canManage = canManageTask(user, taskAccess);
  const canComment = canCommentTask(user, taskAccess);

  return (
    <Stack spacing={3}>
      <PageHeader
        eyebrow="Tarefa"
        title={task.title}
        description={
          task.summary ??
          "Acompanhe a execução completa desta tarefa em uma página própria, com checklist, comentários, diagrama e propriedades."
        }
        chips={[
          task.code,
          task.project.name,
          task.sprint?.name ?? "Sem sprint",
          task.blocked ? "Bloqueada" : "Sem bloqueio",
        ]}
        actions={
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
            <Button
              component={Link}
              href="/tasks"
              variant="outlined"
              startIcon={<ArrowBackRounded />}
            >
              Voltar às tarefas
            </Button>
            <Button
              component={Link}
              href={`/projects/${task.project.id}?taskId=${task.id}`}
              variant="contained"
              startIcon={<FolderOpenRounded />}
            >
              Ver no projeto
            </Button>
          </Stack>
        }
      />

      <Box
        sx={{
          display: "grid",
          gap: 3,
          gridTemplateColumns: { xs: "1fr", xl: "minmax(0, 1fr) 320px" },
          alignItems: "start",
        }}
      >
        <Box
          sx={{
            borderRadius: 6,
            border: "1px solid",
            borderColor: "divider",
            bgcolor: "background.paper",
            p: { xs: 2.5, md: 3.25, xl: 3.5 },
          }}
        >
          <TaskDetailContent
            task={taskDetail}
            projects={taskFormOptions.projects.map((project) => ({
              id: project.id,
              name: project.name,
              sprints: project.sprints.map((sprint) => ({
                id: sprint.id,
                name: sprint.name,
              })),
              tasks: project.tasks.map((projectTask) => ({
                id: projectTask.id,
                code: projectTask.code,
                title: projectTask.title,
              })),
            }))}
            users={taskFormOptions.users}
            canManage={canManage}
            canComment={canComment}
            variant="page"
            showHeader={false}
          />
        </Box>

        <Stack spacing={3}>
          <EntityCard
            eyebrow="Resumo"
            title="Leitura rápida"
            description="Contexto essencial da entrega, sem depender do drawer lateral."
          >
            <Stack spacing={2}>
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                <StatusBadge status={task.status} />
                <PriorityBadge priority={task.priority} />
              </Stack>

              <Box>
                <Typography color="text.secondary" variant="body2">
                  Responsáveis
                </Typography>
                {taskDetail.assignees.length ? (
                  <Box sx={{ mt: 1 }}>
                    <AvatarStack items={taskDetail.assignees} max={6} />
                  </Box>
                ) : (
                  <Typography sx={{ mt: 0.5 }} fontWeight={700}>
                    Sem responsáveis
                  </Typography>
                )}
              </Box>

              <Box>
                <Typography color="text.secondary" variant="body2">
                  Prazo
                </Typography>
                <Typography sx={{ mt: 0.5 }} fontWeight={700}>
                  {formatFullDate(taskDetail.dueDate)}
                </Typography>
                <Typography color="text.secondary" variant="caption">
                  {formatRelativeDate(taskDetail.dueDate)}
                </Typography>
              </Box>

              <Box>
                <Typography color="text.secondary" variant="body2">
                  Dependências
                </Typography>
                <Typography sx={{ mt: 0.5 }} fontWeight={700}>
                  {taskDetail.dependencies.length
                    ? `${taskDetail.dependencies.length} vinculada(s)`
                    : "Sem dependências"}
                </Typography>
              </Box>
            </Stack>
          </EntityCard>

          <EntityCard
            eyebrow="Projeto"
            title={task.project.name}
            description="Esta tarefa continua integrada à página do projeto e ao fluxo do trabalho."
            actions={
              <Button
                component={Link}
                href={`/projects/${task.project.id}?taskId=${task.id}`}
                size="small"
                variant="outlined"
              >
                Abrir projeto
              </Button>
            }
          >
            <Stack spacing={1}>
              <Typography color="text.secondary" variant="body2">
                Sprint
              </Typography>
              <Typography fontWeight={700}>
                {task.sprint?.name ?? "Sem sprint"}
              </Typography>
            </Stack>
          </EntityCard>
        </Stack>
      </Box>
    </Stack>
  );
}
