import { Box, Stack, Typography } from "@mui/material";
import { AvatarStack } from "@/components/ui/avatar-stack";
import { EmptyState } from "@/components/ui/empty-state";
import { EntityCard } from "@/components/ui/entity-card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { TagChip } from "@/components/ui/tag-chip";
import { requireUser } from "@/server/auth/session";
import { listVisibleTeams } from "@/server/services/workspace";

export default async function TeamsPage() {
  const user = await requireUser();
  const teams = await listVisibleTeams(user);
  const myTeams = teams.filter((team) =>
    team.members.some((member) => member.userId === user.id),
  );

  return (
    <Stack spacing={3}>
      <PageHeader
        eyebrow="Equipes"
        title="Colaboração por frentes"
        description="Equipes mais leves, menos tabeladas e mais próximas de um workspace colaborativo premium."
        chips={[`${myTeams.length} equipes minhas`, `${teams.length} equipes visíveis`]}
      />

      {myTeams.length ? (
        <EntityCard
          eyebrow="Minhas equipes"
          title="Onde você atua"
          description="Recorte rápido para dar contexto antes da visão completa."
        >
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            {myTeams.map((team) => (
              <TagChip key={team.id} label={team.name} selected />
            ))}
          </Stack>
        </EntityCard>
      ) : null}

      {teams.length ? (
        <Box
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: {
              xs: "1fr",
              lg: "repeat(2, minmax(0, 1fr))",
            },
          }}
        >
          {teams.map((team) => (
            <EntityCard
              key={team.id}
              eyebrow="Equipe"
              title={team.name}
              description={team.summary}
            >
              <Stack spacing={1.5}>
                <TagChip label={team.focus ?? "Foco em definição"} />
                <Box>
                  <Typography color="text.secondary" variant="body2" sx={{ mb: 1 }}>
                    Membros
                  </Typography>
                  <AvatarStack
                    max={6}
                    items={team.members.map((member) => ({
                      id: member.user.id,
                      name: member.user.name,
                      avatarColor: member.user.avatarColor,
                    }))}
                  />
                </Box>
                <Stack spacing={1}>
                  {team.members.map((member) => (
                    <Stack
                      key={member.id}
                      direction="row"
                      justifyContent="space-between"
                      spacing={1}
                    >
                      <Box>
                        <Typography fontWeight={700}>{member.user.name}</Typography>
                        <Typography color="text.secondary" variant="body2">
                          {member.user.title ?? "Workspace"}
                        </Typography>
                      </Box>
                      <StatusBadge status={member.user.role} />
                    </Stack>
                  ))}
                </Stack>
                <Box>
                  <Typography color="text.secondary" variant="body2" sx={{ mb: 1 }}>
                    Projetos relacionados
                  </Typography>
                  <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                    {team.projects.map((project) => (
                      <TagChip key={project.id} label={`${project.name} • ${project._count.tasks}`} />
                    ))}
                  </Stack>
                </Box>
              </Stack>
            </EntityCard>
          ))}
        </Box>
      ) : (
        <EmptyState message="Nenhuma equipe visível para este usuário." />
      )}
    </Stack>
  );
}
