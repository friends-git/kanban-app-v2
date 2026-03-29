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
    ADMIN: "Visão completa do workspace com leitura operacional e administrativa.",
    MEMBER: "Visão operacional para executar e acompanhar o TCC no ritmo da sprint.",
    COLLABORATOR: "Visão enxuta focada apenas nos projetos e tarefas em que você participa.",
    ADVISOR: "Visão de acompanhamento com foco em andamento, marcos e leitura gerencial.",
  }[user.role];

  return (
    <Stack spacing={3}>
      <PageHeader
        eyebrow="Home"
        title={`Olá, ${user.name.split(" ")[0]}`}
        description={roleCopy}
        chips={["Workspace home", "Resumo por role", "Leitura do dia"]}
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
          eyebrow="Hoje no workspace"
          title="Visão rápida do contexto"
          description="Uma leitura imediata do ritmo atual do TCC, sem ruído de painel corporativo."
          actions={
            <Button component={Link} href="/tasks?view=current" variant="contained" size="small">
              Abrir sprint atual
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
            <MetricBlock label="Abertas" value={data.stats.openTasks} />
            <MetricBlock label="Sprints" value={data.stats.activeSprints} />
            <MetricBlock label="Minhas" value={data.stats.myTasks} />
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
          <KpiCard label="Projetos visíveis" value={data.stats.visibleProjects} helper="Escopo filtrado pelo seu papel." tone="violet" />
          <KpiCard label="Tarefas abertas" value={data.stats.openTasks} helper="Itens ainda em execução no workspace." tone="gold" />
          <KpiCard label="Sprints ativas" value={data.stats.activeSprints} helper="Frentes vivas neste momento." tone="neutral" />
          <KpiCard label="Minhas tarefas" value={data.stats.myTasks} helper="Responsabilidades atribuídas a você." tone="violet" />
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
          title="Distribuição de tarefas"
          description="Leitura rápida de como o trabalho está distribuído entre backlog, execução, revisão e entrega."
        >
          <TaskStatusChart data={data.statusBreakdown} />
        </EntityCard>

        <EntityCard
          eyebrow="Prazos"
          title="Próximos movimentos"
          description="Itens mais sensíveis desta visão."
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
            <EmptyState message="Nenhum prazo visível no momento." />
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
          description="Amostra rápida da fila mais relevante para você agora."
        >
          {data.myTasks.length ? (
            <Stack spacing={1.25}>
              {data.myTasks.map((task) => (
                <TaskCard key={task.id} task={task} href={`/tasks?view=list&taskId=${task.id}`} />
              ))}
            </Stack>
          ) : (
            <EmptyState message="Você ainda não tem tarefas atribuídas." />
          )}
        </EntityCard>

        <EntityCard
          eyebrow="Leitura gerencial"
          title="Panorama do workspace"
          description="Composição do que está visível para você entre projetos, sprints, tarefas e prazos imediatos."
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
