import { AddRounded } from "@mui/icons-material";
import {
  Box,
  Button,
  LinearProgress,
  Stack,
  TableCell,
  TableRow,
  Typography,
} from "@mui/material";
import Link from "next/link";
import { ProjectQuickCreateCard } from "@/components/projects/project-quick-create-card";
import { ProjectStatusBoardDnd } from "@/components/projects/project-status-board-dnd";
import { ProjectStatusListDnd } from "@/components/projects/project-status-list-dnd";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { EntityCard } from "@/components/ui/entity-card";
import { PageHeader } from "@/components/ui/page-header";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate } from "@/lib/formatters";
import { requireUser } from "@/server/auth/session";
import { canCreateProject } from "@/server/permissions";
import { listProjectFormOptions } from "@/server/services/reference-data";
import { listVisibleProjects } from "@/server/services/workspace";

type ProjectsPageProps = {
  searchParams?: Promise<{
    view?: string;
    composer?: string;
  }>;
};

const allowedViews = ["active", "timeline", "board", "all"] as const;

export default async function ProjectsPage({ searchParams }: ProjectsPageProps) {
  const user = await requireUser();
  const projects = await listVisibleProjects(user);
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const currentView = allowedViews.includes(
    (resolvedSearchParams?.view as (typeof allowedViews)[number]) ?? "active",
  )
    ? ((resolvedSearchParams?.view as (typeof allowedViews)[number]) ?? "active")
    : "active";
  const composerOpen = resolvedSearchParams?.composer === "new-project";
  const canCreate = canCreateProject(user);
  const projectFormOptions =
    composerOpen && canCreate ? await listProjectFormOptions() : null;

  const activeProjects = projects.filter(
    (project) => project.status === "ACTIVE" || project.status === "PLANNING" || project.status === "AT_RISK",
  );

  const tabs = [
    { label: "Ativos", value: "active", href: "/projects?view=active", count: activeProjects.length },
    { label: "Cronograma", value: "timeline", href: "/projects?view=timeline", count: projects.length },
    { label: "Quadro", value: "board", href: "/projects?view=board", count: projects.length },
    { label: "Todos", value: "all", href: "/projects?view=all", count: projects.length },
  ];

  return (
    <Stack spacing={3}>
      <PageHeader
        eyebrow="Projetos"
        title="Projetos do TCC"
        description="Acompanhe as frentes do trabalho, responsáveis e prazos em quadro, cronograma ou lista."
        chips={["Quadro e lista", "Prazos do grupo", "Acompanhamento por status"]}
        actions={
          canCreate ? (
            <Button
              component={Link}
              href={composerOpen ? `/projects?view=${currentView}` : `/projects?view=${currentView}&composer=new-project`}
              variant="contained"
              startIcon={<AddRounded />}
            >
              {composerOpen ? "Fechar criação" : "Novo projeto"}
            </Button>
          ) : null
        }
      >
        <SegmentedTabs value={currentView} items={tabs} />
      </PageHeader>

      {composerOpen && projectFormOptions ? (
        <ProjectQuickCreateCard
          cancelHref={`/projects?view=${currentView}`}
          currentUserId={user.id}
          users={projectFormOptions.users}
          teams={projectFormOptions.teams}
        />
      ) : null}

      {projects.length ? renderProjectsView(currentView, projects) : <EmptyState message="Nenhum projeto disponível para você no momento." />}
    </Stack>
  );
}

function renderProjectsView(
  view: (typeof allowedViews)[number],
  projects: Awaited<ReturnType<typeof listVisibleProjects>>,
) {
  if (view === "timeline") {
    return (
      <Stack spacing={2.5}>
        {projects.map((project) => (
          <EntityCard
            key={project.id}
            eyebrow={project.team?.name ?? "Grupo do TCC"}
            title={project.name}
            description={project.summary}
            actions={<StatusBadge status={project.status} />}
          >
            <Box
              sx={{
                display: "grid",
                gap: 2,
                gridTemplateColumns: { xs: "1fr", xl: "220px minmax(0, 1fr) 120px" },
                alignItems: "center",
              }}
            >
              <Typography color="text.secondary">
                {formatDate(project.startDate)} até {formatDate(project.dueDate)}
              </Typography>
              <Box>
                <LinearProgress
                  variant="determinate"
                  value={project.status === "COMPLETED" ? 100 : project.status === "ACTIVE" ? 70 : 35}
                  color={project.status === "AT_RISK" ? "warning" : "secondary"}
                  sx={{ height: 10, borderRadius: 999 }}
                />
              </Box>
              <Typography color="text.secondary" textAlign={{ xl: "right" }}>
                {project._count.tasks} tarefas
              </Typography>
            </Box>
          </EntityCard>
        ))}
      </Stack>
    );
  }

  if (view === "board") {
    return <ProjectStatusBoardDnd projects={projects.map(toProjectDndItem)} />;
  }

  if (view === "all") {
    return (
      <Stack spacing={1.5}>
        <SectionHeading
          eyebrow="Todos"
          title="Todos os projetos"
          meta={`${projects.length} projetos para acompanhar neste momento`}
        />
        <DataTable columns={["Projeto", "Equipe", "Status", "Prazo", "Tarefas"]}>
          {projects.map((project) => (
            <TableRow key={project.id} hover>
              <TableCell>
                <Box>
                  <Typography fontWeight={700}>{project.name}</Typography>
                  <Typography color="text.secondary" variant="body2">
                    {project.summary}
                  </Typography>
                </Box>
              </TableCell>
              <TableCell>{project.team?.name ?? "Sem equipe"}</TableCell>
              <TableCell>
                <StatusBadge status={project.status} />
              </TableCell>
              <TableCell>{formatDate(project.dueDate)}</TableCell>
              <TableCell>{project._count.tasks}</TableCell>
            </TableRow>
          ))}
        </DataTable>
      </Stack>
    );
  }

  return (
    <Stack spacing={1.5}>
      <SectionHeading
        eyebrow="Em andamento"
        title="Projetos ativos"
        meta={`${activeProjectsCount(projects)} projetos em andamento para acompanhar e atualizar.`}
      />
      <ProjectStatusListDnd projects={projects.map(toProjectDndItem)} />
    </Stack>
  );
}

function activeProjectsCount(
  projects: Awaited<ReturnType<typeof listVisibleProjects>>,
) {
  return projects.filter(
    (project) =>
      project.status === "ACTIVE" ||
      project.status === "PLANNING" ||
      project.status === "AT_RISK",
  ).length;
}

function toProjectDndItem(
  project: Awaited<ReturnType<typeof listVisibleProjects>>[number],
) {
  return {
    id: project.id,
    name: project.name,
    slug: project.slug,
    summary: project.summary,
    status: project.status,
    visibility: project.visibility,
    dueDate: project.dueDate?.toISOString() ?? null,
    team: project.team ? { name: project.team.name } : null,
    owner: { name: project.owner.name },
    members: project.members.map((member) => ({
      user: {
        id: member.user.id,
        name: member.user.name,
        avatarColor: member.user.avatarColor,
      },
    })),
    _count: {
      tasks: project._count.tasks,
      sprints: project._count.sprints,
    },
  };
}

function SectionHeading({
  eyebrow,
  title,
  meta,
}: {
  eyebrow: string;
  title: string;
  meta: string;
}) {
  return (
    <Stack
      direction={{ xs: "column", md: "row" }}
      justifyContent="space-between"
      spacing={1}
      sx={{ px: { xs: 0.5, md: 1 } }}
    >
      <Box>
        <Typography
          variant="overline"
          sx={{ color: "secondary.main", letterSpacing: "0.14em" }}
        >
          {eyebrow}
        </Typography>
        <Typography variant="h3" sx={{ fontSize: "1.1rem" }}>
          {title}
        </Typography>
      </Box>
      <Typography color="text.secondary" variant="body2">
        {meta}
      </Typography>
    </Stack>
  );
}
