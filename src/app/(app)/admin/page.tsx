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
          title="Admin simples do workspace"
          description="Área reservada para administração leve de usuários, equipes e memberships do projeto."
        />
        <Alert severity="warning">
          Seu papel não permite acessar o painel administrativo.
        </Alert>
      </Stack>
    );
  }

  return (
    <Stack spacing={3}>
      <PageHeader
        eyebrow="Admin"
        title="Admin simples do workspace"
        description="Gestão do workspace sem virar painel corporativo: usuários, roles, equipes e memberships."
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
        <KpiCard label="Usuários" value={data.users.length} helper="Base total do workspace." tone="violet" />
        <KpiCard label="Sessões ativas" value={data.sessionCount} helper="Acesso em uso no momento." tone="gold" />
        <KpiCard label="Projetos" value={data.projectCount} helper="Frentes cadastradas." />
        <KpiCard label="Tarefas" value={data.taskCount} helper="Itens cadastrados na base." />
      </Box>

      <EntityCard
        eyebrow="Distribuição"
        title="Composição do workspace"
        description="Leitura visual rápida dos papéis globais."
      >
        <RoleDistributionChart data={data.roleDistribution} />
      </EntityCard>

      <EntityCard
        eyebrow="Usuários"
        title="Base administrativa"
        description="Resumo do seed inicial para gestão de papéis e memberships."
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
