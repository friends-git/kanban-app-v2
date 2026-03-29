import { Box, Button, Stack, Typography } from "@mui/material";
import Link from "next/link";
import { RoleDistributionChart } from "@/components/charts/role-distribution-chart";
import { TaskStatusChart } from "@/components/charts/task-status-chart";
import { EmptyState } from "@/components/ui/empty-state";
import { EntityCard } from "@/components/ui/entity-card";
import { KpiCard } from "@/components/ui/kpi-card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { TaskCard } from "@/components/ui/task-card";
import { formatRelativeDate } from "@/lib/formatters";
import { requireUser } from "@/server/auth/session";
import { getDashboardData } from "@/server/services/workspace";

export default async function DashboardPage() {
  const user = await requireUser();
  const data = await getDashboardData(user);

  const roleCopy = {
    ADMIN: "Acompanhe o andamento do grupo, a distribuição do trabalho e os pontos que precisam de atenção.",
    MEMBER: "Veja o que está em andamento, suas responsabilidades e os próximos prazos do TCC.",
    COLLABORATOR: "Acesse as frentes em que você participa e acompanhe o que precisa ser entregue.",
    ADVISOR: "Acompanhe a evolução do trabalho, os marcos ativos e os próximos prazos do grupo.",
  }[user.role];

  return (
    <Stack spacing={3}>
      <PageHeader
        eyebrow="Painel"
        title={`Olá, ${user.name.split(" ")[0]}`}
        description={roleCopy}
        chips={["Panorama do grupo", "Progresso do trabalho", "Leitura do dia"]}
      />

      <Box
        sx={{
          display: "grid",
          gap: 2.5,
          gridTemplateColumns: {
            xs: "1fr",
            xl: "1.05fr 0.95fr",
          },
        }}
      >
        <EntityCard
          eyebrow="Hoje"
          title="Panorama do trabalho"
          description="Um resumo rápido do que está em andamento no TCC neste momento."
          actions={
            <Button component={Link} href="/tasks?view=current" variant="contained" size="small">
              Ver sprint atual
            </Button>
          }
        >
          <Box
            sx={{
              display: "grid",
              gap: 1.5,
              gridTemplateColumns: {
                xs: "repeat(2, minmax(0, 1fr))",
                md: "repeat(4, minmax(0, 1fr))",
              },
            }}
          >
            <MetricBlock label="Projetos" value={data.stats.visibleProjects} />
            <MetricBlock label="Em aberto" value={data.stats.openTasks} />
            <MetricBlock label="Sprints ativas" value={data.stats.activeSprints} />
            <MetricBlock label="Minhas entregas" value={data.stats.myTasks} />
          </Box>
        </EntityCard>

        <Box
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: {
              xs: "1fr",
              md: "repeat(2, minmax(0, 1fr))",
            },
          }}
        >
          <KpiCard label="Projetos visíveis" value={data.stats.visibleProjects} helper="Frentes que você pode acompanhar nesta visão." tone="violet" />
          <KpiCard label="Tarefas em aberto" value={data.stats.openTasks} helper="Itens que ainda precisam avançar." tone="gold" />
          <KpiCard label="Sprints ativas" value={data.stats.activeSprints} helper="Ciclos em execução agora." tone="neutral" />
          <KpiCard label="Minhas tarefas" value={data.stats.myTasks} helper="Responsabilidades que estão com você." tone="violet" />
        </Box>
      </Box>

      <Box
        sx={{
          display: "grid",
          gap: 3,
          gridTemplateColumns: { xs: "1fr", xl: "1.1fr 0.9fr" },
        }}
      >
        <EntityCard
          eyebrow="Resumo"
          title="Andamento das tarefas"
          description="Veja como o trabalho está distribuído entre planejamento, execução, revisão e conclusão."
        >
          <TaskStatusChart data={data.statusBreakdown} />
        </EntityCard>

        <EntityCard
          eyebrow="Prazos"
          title="Próximos prazos"
          description="Entregas e tarefas que merecem atenção agora."
        >
          {data.upcoming.length ? (
            <Stack spacing={1.25}>
              {data.upcoming.map((task) => (
                <Box
                  key={task.id}
                  sx={{
                    p: 1.75,
                    borderRadius: 4,
                    border: "1px solid",
                    borderColor: "divider",
                    bgcolor: "action.hover",
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" spacing={1.25}>
                    <Box>
                      <Typography fontWeight={700}>{task.title}</Typography>
                      <Typography color="text.secondary" variant="body2">
                        {task.project.name} • {formatRelativeDate(task.dueDate)}
                      </Typography>
                    </Box>
                    <StatusBadge status={task.status} />
                  </Stack>
                </Box>
              ))}
            </Stack>
          ) : (
            <EmptyState message="Nenhum prazo próximo para acompanhar agora." />
          )}
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
          title={user.role === "ADVISOR" ? "Itens observados" : "Minhas tarefas"}
          description="As tarefas mais relevantes para você neste momento."
        >
          {data.myTasks.length ? (
            <Stack spacing={1.25}>
              {data.myTasks.map((task) => (
                <TaskCard key={task.id} task={task} href={`/tasks?view=list&taskId=${task.id}`} />
              ))}
            </Stack>
          ) : (
            <EmptyState message="Nenhuma tarefa atribuída a você no momento." />
          )}
        </EntityCard>

        <EntityCard
          eyebrow="Visão geral"
          title="Panorama do trabalho"
          description="Resumo do que está em andamento entre projetos, sprints, tarefas e prazos."
        >
          <RoleDistributionChart
            data={[
              { label: "Projetos", value: data.projects.length },
              { label: "Sprints", value: data.sprints.length },
              { label: "Tarefas", value: data.tasks.length },
              { label: "Prazos", value: data.upcoming.length },
            ]}
          />
        </EntityCard>
      </Box>
    </Stack>
  );
}

function MetricBlock({ label, value }: { label: string; value: number }) {
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
      <Typography variant="h3" sx={{ mt: 0.75 }}>
        {value}
      </Typography>
    </Box>
  );
}
