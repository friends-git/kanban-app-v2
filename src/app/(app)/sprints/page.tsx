import { Box, Stack, Typography } from "@mui/material";
import { EmptyState } from "@/components/ui/empty-state";
import { EntityCard } from "@/components/ui/entity-card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { TagChip } from "@/components/ui/tag-chip";
import { formatFullDate } from "@/lib/formatters";
import { requireUser } from "@/server/auth/session";
import { listVisibleSprints } from "@/server/services/workspace";

export default async function SprintsPage() {
  const user = await requireUser();
  const sprints = await listVisibleSprints(user);
  const currentSprint = sprints.find((sprint) => sprint.status === "ACTIVE");

  return (
    <Stack spacing={3}>
      <PageHeader
        eyebrow="Sprints"
        title="Cadência do MVP"
        description="Agrupamentos por sprint com a mesma linguagem visual de projetos e dashboard."
      />

      {currentSprint ? (
        <EntityCard
          eyebrow="Sprint atual"
          title={currentSprint.name}
          description={currentSprint.goal ?? "Sem objetivo definido"}
          actions={<StatusBadge status={currentSprint.status} />}
        >
          <Box
            sx={{
              display: "grid",
              gap: 1.5,
              gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" },
            }}
          >
            <Metric label="Projeto" value={currentSprint.project.name} />
            <Metric
              label="Período"
              value={`${formatFullDate(currentSprint.startDate)} até ${formatFullDate(currentSprint.endDate)}`}
            />
            <Metric label="Tarefas" value={`${currentSprint.tasks.length}`} />
          </Box>
        </EntityCard>
      ) : null}

      {sprints.length ? (
        <Stack spacing={2}>
          {sprints.map((sprint) => (
            <EntityCard
              key={sprint.id}
              eyebrow={sprint.project.name}
              title={sprint.name}
              description={sprint.goal ?? "Sem objetivo definido"}
              actions={<StatusBadge status={sprint.status} />}
            >
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                <TagChip label={`${sprint.tasks.length} tarefas`} selected={sprint.status === "ACTIVE"} />
                <TagChip label={formatFullDate(sprint.startDate)} />
                <TagChip label={formatFullDate(sprint.endDate)} />
              </Stack>
            </EntityCard>
          ))}
        </Stack>
      ) : (
        <EmptyState message="Nenhuma sprint disponível nesta visão." />
      )}
    </Stack>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Typography color="text.secondary" variant="body2">
        {label}
      </Typography>
      <Typography fontWeight={700}>{value}</Typography>
    </Box>
  );
}
