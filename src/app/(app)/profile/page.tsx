import { Box, Button, Stack, Typography } from "@mui/material";
import Link from "next/link";
import { TaskStatusChart } from "@/components/charts/task-status-chart";
import { ProfilePasswordForm } from "@/components/profile/profile-password-form";
import { EmptyState } from "@/components/ui/empty-state";
import { EntityCard } from "@/components/ui/entity-card";
import { KpiCard } from "@/components/ui/kpi-card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { TaskCard } from "@/components/ui/task-card";
import { roleLabels } from "@/lib/domain";
import { formatDate, formatRelativeDate } from "@/lib/formatters";
import { requireUser } from "@/server/auth/session";
import { getProfilePageData } from "@/server/services/workspace";

export default async function ProfilePage() {
  const user = await requireUser();
  const data = await getProfilePageData(user);

  return (
    <Stack spacing={3}>
      <PageHeader
        eyebrow="Perfil"
        title={user.name}
        description="Acompanhe sua carga de trabalho, seus prazos e o ritmo das suas entregas em um só lugar."
        chips={[
          roleLabels[user.role],
          user.title ?? "Participante do grupo",
          `${data.stats.assignedTasks} tarefas atribuídas`,
        ]}
        actions={
          <Button component={Link} href="/tasks?view=list" variant="outlined">
            Abrir minhas tarefas
          </Button>
        }
      />

      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: {
            xs: "1fr",
            md: "repeat(2, minmax(0, 1fr))",
            xl: "repeat(4, minmax(0, 1fr))",
          },
        }}
      >
        <KpiCard
          label="Tarefas atribuídas"
          value={data.stats.assignedTasks}
          helper="Tudo o que está sob sua responsabilidade."
          tone="violet"
        />
        <KpiCard
          label="Em aberto"
          value={data.stats.openTasks}
          helper="Itens que ainda precisam avançar."
          tone="gold"
        />
        <KpiCard
          label="Concluídas"
          value={data.stats.completedTasks}
          helper="Entregas já finalizadas por você."
          tone="neutral"
        />
        <KpiCard
          label="Atrasadas"
          value={data.stats.overdueTasks}
          helper="Tarefas com prazo vencido que ainda precisam de ação."
          tone="violet"
        />
      </Box>

      <Box
        sx={{
          display: "grid",
          gap: 3,
          gridTemplateColumns: { xs: "1fr", xl: "1.1fr 0.9fr" },
        }}
      >
        <EntityCard
          eyebrow="Demanda"
          title="Minha distribuição de tarefas"
          description="Veja como suas responsabilidades estão distribuídas entre backlog, execução, revisão e conclusão."
        >
          <TaskStatusChart data={data.statusBreakdown} />
        </EntityCard>

        <EntityCard
          eyebrow="Segurança"
          title="Acesso e senha"
          description="Revise seus dados de acesso e atualize sua senha quando precisar."
        >
          <Box
            sx={{
              display: "grid",
              gap: 1.25,
              gridTemplateColumns: {
                xs: "1fr",
                md: "repeat(3, minmax(0, 1fr))",
              },
            }}
          >
            <ProfileDetail label="E-mail" value={user.email} />
            <ProfileDetail label="Papel" value={roleLabels[user.role]} />
            <ProfileDetail label="Função" value={user.title ?? "Participante do grupo"} />
          </Box>
          <ProfilePasswordForm />
        </EntityCard>
      </Box>

      <Box
        sx={{
          display: "grid",
          gap: 3,
          gridTemplateColumns: { xs: "1fr", xl: "repeat(2, minmax(0, 1fr))" },
        }}
      >
        <EntityCard
          eyebrow="Foco"
          title="Minhas tarefas em aberto"
          description="Itens atribuídos a você que merecem atenção agora."
        >
          {data.openTasks.length ? (
            <Stack spacing={1.25}>
              {data.openTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  href={`/tasks?view=list&taskId=${task.id}`}
                  contextLabel={task.project.name}
                />
              ))}
            </Stack>
          ) : (
            <EmptyState message="Nenhuma tarefa em aberto atribuída a você no momento." />
          )}
        </EntityCard>

        <EntityCard
          eyebrow="Entregas"
          title="Minha visibilidade de entregas"
          description="Prazos próximos, entregas recentes e indicadores do seu ritmo de execução."
        >
          <Box
            sx={{
              display: "grid",
              gap: 1.25,
              gridTemplateColumns: {
                xs: "repeat(2, minmax(0, 1fr))",
                md: "repeat(4, minmax(0, 1fr))",
              },
            }}
          >
            <MiniMetric label="Projetos" value={data.stats.projectsCount} />
            <MiniMetric label="Sprints ativas" value={data.stats.activeSprintCount} />
            <MiniMetric label="Conclusão" value={`${data.stats.completionRate}%`} />
            <MiniMetric
              label="No prazo"
              value={
                data.stats.onTimeRate === null ? "—" : `${data.stats.onTimeRate}%`
              }
            />
          </Box>

          <Stack spacing={2}>
            <Box>
              <Typography
                color="text.secondary"
                variant="body2"
                sx={{ textTransform: "uppercase", letterSpacing: "0.08em" }}
              >
                Próximos prazos
              </Typography>
              <Stack spacing={1} sx={{ mt: 1.25 }}>
                {data.upcomingTasks.length ? (
                  data.upcomingTasks.map((task) => (
                    <DeliveryRow
                      key={task.id}
                      href={`/tasks?view=list&taskId=${task.id}`}
                      title={task.title}
                      subtitle={`${task.project.name} • ${formatRelativeDate(task.dueDate)}`}
                      trailing={<StatusBadge status={task.status} />}
                    />
                  ))
                ) : (
                  <EmptyState message="Nenhum prazo próximo entre as suas tarefas." />
                )}
              </Stack>
            </Box>

            <Box>
              <Typography
                color="text.secondary"
                variant="body2"
                sx={{ textTransform: "uppercase", letterSpacing: "0.08em" }}
              >
                Entregas recentes
              </Typography>
              <Stack spacing={1} sx={{ mt: 1.25 }}>
                {data.recentCompleted.length ? (
                  data.recentCompleted.map((task) => (
                    <DeliveryRow
                      key={task.id}
                      href={`/tasks?view=list&taskId=${task.id}`}
                      title={task.title}
                      subtitle={`${task.project.name} • concluída ${formatDate(task.completedAt)}`}
                      trailing={<StatusBadge status={task.status} />}
                    />
                  ))
                ) : (
                  <EmptyState message="Nenhuma entrega concluída recentemente por você." />
                )}
              </Stack>
            </Box>
          </Stack>
        </EntityCard>
      </Box>
    </Stack>
  );
}

function ProfileDetail({ label, value }: { label: string; value: string }) {
  return (
    <Box
      sx={{
        p: 1.5,
        borderRadius: 4,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "action.hover",
      }}
    >
      <Typography
        color="text.secondary"
        variant="body2"
        sx={{ textTransform: "uppercase", letterSpacing: "0.08em" }}
      >
        {label}
      </Typography>
      <Typography fontWeight={700} sx={{ mt: 0.7 }}>
        {value}
      </Typography>
    </Box>
  );
}

function MiniMetric({ label, value }: { label: string; value: number | string }) {
  return (
    <Box
      sx={{
        p: 1.5,
        borderRadius: 4,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "action.hover",
      }}
    >
      <Typography color="text.secondary" variant="body2">
        {label}
      </Typography>
      <Typography variant="h3" sx={{ mt: 0.75 }}>
        {value}
      </Typography>
    </Box>
  );
}

function DeliveryRow({
  href,
  title,
  subtitle,
  trailing,
}: {
  href: string;
  title: string;
  subtitle: string;
  trailing: React.ReactNode;
}) {
  return (
    <Box
      component={Link}
      href={href}
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 1.25,
        p: 1.5,
        borderRadius: 4,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        color: "inherit",
        textDecoration: "none",
        transition:
          "transform 180ms ease, border-color 180ms ease, background-color 180ms ease",
        "&:hover": {
          borderColor: "rgba(93, 5, 255, 0.22)",
          bgcolor: "action.hover",
          transform: "translateY(-1px)",
        },
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography fontWeight={700}>{title}</Typography>
        <Typography color="text.secondary" variant="body2">
          {subtitle}
        </Typography>
      </Box>
      {trailing}
    </Box>
  );
}
