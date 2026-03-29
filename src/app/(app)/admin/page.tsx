import { Alert, Box, Stack } from "@mui/material";
import { AdminUserCreateForm } from "@/components/admin/admin-user-create-form";
import { AdminUserManagementTable } from "@/components/admin/admin-user-management-table";
import { RoleDistributionChart } from "@/components/charts/role-distribution-chart";
import { EntityCard } from "@/components/ui/entity-card";
import { KpiCard } from "@/components/ui/kpi-card";
import { PageHeader } from "@/components/ui/page-header";
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
        eyebrow="Acesso"
        title="Cadastrar novo usuário"
        description="Crie um acesso com e-mail padronizado da plataforma e senha inicial controlada pelo admin."
      >
        <AdminUserCreateForm />
      </EntityCard>

      <EntityCard
        eyebrow="Usuários"
        title="Usuários do workspace"
        description="Gerencie papéis globais e recupere o acesso de quem precisar voltar ao workspace."
      >
        <AdminUserManagementTable currentUserId={user.id} users={data.users} />
      </EntityCard>
    </Stack>
  );
}
