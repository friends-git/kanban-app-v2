import { Box, Stack, Typography } from "@mui/material";
import { TeamQuickCreateDialog } from "@/components/teams/team-quick-create-dialog";
import { AvatarStack } from "@/components/ui/avatar-stack";
import { EmptyState } from "@/components/ui/empty-state";
import { EntityCard } from "@/components/ui/entity-card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { TagChip } from "@/components/ui/tag-chip";
import { requireUser } from "@/server/auth/session";
import { canCreateTeam } from "@/server/permissions";
import { listTeamFormOptions } from "@/server/services/reference-data";
import { listVisibleTeams } from "@/server/services/workspace";

export default async function TeamsPage() {
  const user = await requireUser();
  const allowCreateTeam = canCreateTeam(user);
  const [teams, teamFormOptions] = await Promise.all([
    listVisibleTeams(user),
    allowCreateTeam ? listTeamFormOptions() : Promise.resolve(null),
  ]);
  const myTeams = teams.filter((team) =>
    team.members.some((member) => member.userId === user.id),
  );

  return (
    <Stack spacing={3}>
      <PageHeader
        eyebrow="Equipes"
        title="Equipes e responsáveis"
        description="Veja quem participa de cada frente do TCC e como o grupo está organizado."
        chips={[`${myTeams.length} equipes com você`, `${teams.length} equipes visíveis`]}
        actions={
          allowCreateTeam && teamFormOptions ? (
            <TeamQuickCreateDialog
              currentUserId={user.id}
              currentUserName={user.name}
              users={teamFormOptions.users.map((member) => ({
                id: member.id,
                name: member.name,
              }))}
            />
          ) : null
        }
      />

      {myTeams.length ? (
        <EntityCard
          eyebrow="Minhas equipes"
          title="Equipes em que você atua"
          description="Um resumo rápido das frentes em que você participa."
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
                <TagChip label={team.focus ?? "Foco a definir"} />
                <Box>
                  <Typography color="text.secondary" variant="body2" sx={{ mb: 1 }}>
                    Participantes
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
                          {member.user.title ?? "Grupo do TCC"}
                        </Typography>
                      </Box>
                      <StatusBadge status={member.user.role} />
                    </Stack>
                  ))}
                </Stack>
                <Box>
                  <Typography color="text.secondary" variant="body2" sx={{ mb: 1 }}>
                    Projetos acompanhados
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
        <EmptyState
          title="Nenhuma equipe cadastrada ainda"
          message={
            allowCreateTeam
              ? "Use o botão de nova equipe para começar a organizar as frentes do projeto."
              : "Nenhuma equipe disponível para você no momento."
          }
        />
      )}
    </Stack>
  );
}
