"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Alert,
  Box,
  Button,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  ProjectComplexity,
  ProjectPriority,
  ProjectStatus,
  ProjectVisibility,
} from "@prisma/client";
import { useRouter } from "next/navigation";
import { updateProjectAction } from "@/server/actions/projects";
import {
  projectComplexityLabels,
  projectPriorityLabels,
  projectStatusLabels,
  projectVisibilityLabels,
} from "@/lib/domain";
import { formatDate, formatDateInput } from "@/lib/formatters";

type ProjectPropertiesPanelProps = {
  project: {
    id: string;
    name: string;
    description: string | null;
    status: ProjectStatus;
    priority: ProjectPriority;
    complexity: ProjectComplexity;
    visibility: ProjectVisibility;
    ownerId: string;
    owner: { name: string };
    teamId: string | null;
    team?: { name: string } | null;
    dueDate: Date | null;
  };
  users: Array<{
    id: string;
    name: string;
  }>;
  teams: Array<{
    id: string;
    name: string;
  }>;
  canManage: boolean;
};

type FormState = {
  name: string;
  description: string;
  ownerId: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  complexity: ProjectComplexity;
  visibility: ProjectVisibility;
  teamId: string;
  dueDate: string;
};

function getInitialState(project: ProjectPropertiesPanelProps["project"]): FormState {
  return {
    name: project.name,
    description: project.description ?? "",
    ownerId: project.ownerId,
    status: project.status,
    priority: project.priority,
    complexity: project.complexity,
    visibility: project.visibility,
    teamId: project.teamId ?? "",
    dueDate: formatDateInput(project.dueDate),
  };
}

const quietFieldSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: 3,
    bgcolor: "transparent",
  },
  "& .MuiOutlinedInput-notchedOutline": {
    borderColor: "rgba(128, 128, 128, 0.12)",
  },
};

export function ProjectPropertiesPanel({
  project,
  users,
  teams,
  canManage,
}: ProjectPropertiesPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(() => getInitialState(project));

  useEffect(() => {
    setForm(getInitialState(project));
    setError(null);
    setSuccess(null);
  }, [project]);

  const handleSave = () => {
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const result = await updateProjectAction({
        id: project.id,
        name: form.name,
        description: form.description,
        ownerId: form.ownerId,
        status: form.status,
        priority: form.priority,
        complexity: form.complexity,
        visibility: form.visibility,
        teamId: form.teamId || null,
        dueDate: form.dueDate || null,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setSuccess("Projeto atualizado.");
      router.refresh();
    });
  };

  return (
    <Stack spacing={1.5}>
      {error ? <Alert severity="error">{error}</Alert> : null}
      {success ? <Alert severity="success">{success}</Alert> : null}

      <Box
        sx={{
          borderRadius: 5,
          border: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
          p: 0.5,
        }}
      >
        <Box
          sx={{
            borderRadius: 4,
            overflow: "hidden",
            bgcolor: "background.paper",
          }}
        >
          <PropertyRow label="Nome">
          {canManage ? (
            <TextField
              fullWidth
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
              sx={quietFieldSx}
            />
          ) : (
            <ValueText>{project.name}</ValueText>
          )}
          </PropertyRow>

          <PropertyRow label="Responsável">
          {canManage ? (
            <TextField
              fullWidth
              select
              value={form.ownerId}
              onChange={(event) =>
                setForm((current) => ({ ...current, ownerId: event.target.value }))
              }
              sx={quietFieldSx}
            >
              {users.map((user) => (
                <MenuItem key={user.id} value={user.id}>
                  {user.name}
                </MenuItem>
              ))}
            </TextField>
          ) : (
            <ValueText>{project.owner.name}</ValueText>
          )}
          </PropertyRow>

          <PropertyGrid>
          <PropertyRow label="Status" compact>
            {canManage ? (
              <TextField
                fullWidth
                select
                value={form.status}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    status: event.target.value as ProjectStatus,
                  }))
                }
                sx={quietFieldSx}
              >
                {Object.entries(projectStatusLabels).map(([value, label]) => (
                  <MenuItem key={value} value={value}>
                    {label}
                  </MenuItem>
                ))}
              </TextField>
            ) : (
              <ValueText>{projectStatusLabels[project.status]}</ValueText>
            )}
          </PropertyRow>

          <PropertyRow label="Prioridade" compact>
            {canManage ? (
              <TextField
                fullWidth
                select
                value={form.priority}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    priority: event.target.value as ProjectPriority,
                  }))
                }
                sx={quietFieldSx}
              >
                {Object.entries(projectPriorityLabels).map(([value, label]) => (
                  <MenuItem key={value} value={value}>
                    {label}
                  </MenuItem>
                ))}
              </TextField>
            ) : (
              <ValueText>{projectPriorityLabels[project.priority]}</ValueText>
            )}
          </PropertyRow>

          <PropertyRow label="Complexidade" compact>
            {canManage ? (
              <TextField
                fullWidth
                select
                value={form.complexity}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    complexity: event.target.value as ProjectComplexity,
                  }))
                }
                sx={quietFieldSx}
              >
                {Object.entries(projectComplexityLabels).map(([value, label]) => (
                  <MenuItem key={value} value={value}>
                    {label}
                  </MenuItem>
                ))}
              </TextField>
            ) : (
              <ValueText>{projectComplexityLabels[project.complexity]}</ValueText>
            )}
          </PropertyRow>

          <PropertyRow label="Visibilidade" compact>
            {canManage ? (
              <TextField
                fullWidth
                select
                value={form.visibility}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    visibility: event.target.value as ProjectVisibility,
                  }))
                }
                sx={quietFieldSx}
              >
                {Object.entries(projectVisibilityLabels).map(([value, label]) => (
                  <MenuItem key={value} value={value}>
                    {label}
                  </MenuItem>
                ))}
              </TextField>
            ) : (
              <ValueText>{projectVisibilityLabels[project.visibility]}</ValueText>
            )}
          </PropertyRow>

          <PropertyRow label="Equipe" compact>
            {canManage ? (
              <TextField
                fullWidth
                select
                value={form.teamId}
                onChange={(event) =>
                  setForm((current) => ({ ...current, teamId: event.target.value }))
                }
                sx={quietFieldSx}
              >
                <MenuItem value="">Sem equipe</MenuItem>
                {teams.map((team) => (
                  <MenuItem key={team.id} value={team.id}>
                    {team.name}
                  </MenuItem>
                ))}
              </TextField>
            ) : (
              <ValueText>{project.team?.name ?? "Sem equipe"}</ValueText>
            )}
          </PropertyRow>

          <PropertyRow label="Prazo" compact>
            {canManage ? (
              <TextField
                fullWidth
                type="date"
                value={form.dueDate}
                onChange={(event) =>
                  setForm((current) => ({ ...current, dueDate: event.target.value }))
                }
                slotProps={{ inputLabel: { shrink: true } }}
                sx={quietFieldSx}
              />
            ) : (
              <ValueText>{formatDate(project.dueDate)}</ValueText>
            )}
          </PropertyRow>
          </PropertyGrid>

          <PropertyRow label="Descrição">
          {canManage ? (
            <TextField
              fullWidth
              multiline
              minRows={4}
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              sx={quietFieldSx}
            />
          ) : (
            <Typography color="text.secondary">
              {project.description ?? "Sem descrição expandida."}
            </Typography>
          )}
          </PropertyRow>
        </Box>
      </Box>

      {canManage ? (
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          spacing={1.5}
          alignItems={{ sm: "center" }}
        >
          <Typography color="text.secondary" variant="body2">
            Propriedades principais da página do projeto.
          </Typography>
          <Button onClick={handleSave} variant="contained" disabled={isPending}>
            {isPending ? "Salvando..." : "Salvar alterações"}
          </Button>
        </Stack>
      ) : null}
    </Stack>
  );
}

function PropertyGrid({ children }: { children: React.ReactNode }) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", xl: "repeat(2, minmax(0, 1fr))" },
      }}
    >
      {children}
    </Box>
  );
}

function PropertyRow({
  label,
  children,
  compact = false,
}: {
  label: string;
  children: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "140px minmax(0, 1fr)" },
        gap: 1.75,
        alignItems: compact ? "center" : "start",
        px: { xs: 2.25, md: 2.75 },
        py: compact ? 1.6 : 2.1,
        borderBottom: "1px solid",
        borderColor: "divider",
        "&:last-of-type": {
          borderBottom: "none",
        },
      }}
    >
      <Typography
        color="text.secondary"
        variant="body2"
        sx={{ pt: compact ? 0 : 0.75 }}
      >
        {label}
      </Typography>
      <Box sx={{ minWidth: 0 }}>{children}</Box>
    </Box>
  );
}

function ValueText({ children }: { children: React.ReactNode }) {
  return (
    <Typography fontWeight={700} sx={{ minHeight: 24, display: "flex", alignItems: "center" }}>
      {children}
    </Typography>
  );
}
