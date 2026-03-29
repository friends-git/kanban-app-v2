import { Alert, Box, Stack, TableCell, TableRow, Typography } from "@mui/material";
import { RoleDistributionChart } from "@/components/charts/role-distribution-chart";
import { DataTable } from "@/components/ui/data-table";
import { EntityCard } from "@/components/ui/entity-card";
import { KpiCard } from "@/components/ui/kpi-card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireUser } from "@/server/auth/session";
import { getAdminPageData } from "@/server/services/workspace";

export default async function AdminPage() {
  const user = await requireUser();
  const data = await getAdminPageData(user);

  if (!data) {
    return (
      <Stack spacing={3}>
        <PageHeader
          eyebrow="Admin"
          title="Gestão do workspace"
          description="Área reservada para acompanhar usuários, acessos e estrutura do grupo."
        />
        <Alert severity="warning">
          Seu perfil não tem acesso à gestão do workspace.
        </Alert>
      </Stack>
    );
  }

  return (
    <Stack spacing={3}>
      <PageHeader
        eyebrow="Admin"
        title="Gestão do workspace"
        description="Acompanhe usuários, acessos e vínculos do grupo em um único lugar."
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
        <KpiCard label="Usuários" value={data.users.length} helper="Pessoas com acesso ao workspace." tone="violet" />
        <KpiCard label="Sessões ativas" value={data.sessionCount} helper="Acessos em uso neste momento." tone="gold" />
        <KpiCard label="Projetos" value={data.projectCount} helper="Frentes registradas no trabalho." />
        <KpiCard label="Tarefas" value={data.taskCount} helper="Atividades acompanhadas pelo grupo." />
      </Box>

      <EntityCard
        eyebrow="Distribuição"
        title="Distribuição de papéis"
        description="Veja como os perfis do grupo estão distribuídos no workspace."
      >
        <RoleDistributionChart data={data.roleDistribution} />
      </EntityCard>

      <EntityCard
        eyebrow="Usuários"
        title="Usuários do workspace"
        description="Resumo de participantes, papéis e vínculos com equipes e projetos."
      >
        <DataTable columns={["Nome", "Papel", "E-mail", "Projetos", "Equipes", "Tarefas"]}>
          {data.users.map((workspaceUser) => (
            <TableRow key={workspaceUser.id} hover>
              <TableCell>
                <Box>
                  <Typography fontWeight={700}>{workspaceUser.name}</Typography>
                  <Typography color="text.secondary" variant="body2">
                    {workspaceUser.title ?? "Sem título"}
                  </Typography>
                </Box>
              </TableCell>
              <TableCell>
                <StatusBadge status={workspaceUser.role} />
              </TableCell>
              <TableCell>{workspaceUser.email}</TableCell>
              <TableCell>{workspaceUser._count.projectMemberships}</TableCell>
              <TableCell>{workspaceUser._count.teamMemberships}</TableCell>
              <TableCell>{workspaceUser._count.taskAssignments}</TableCell>
            </TableRow>
          ))}
        </DataTable>
      </EntityCard>
    </Stack>
  );
}
