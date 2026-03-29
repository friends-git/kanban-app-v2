"use client";

import { useState, useTransition } from "react";
import { ExpandMoreRounded, TuneRounded } from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useRouter } from "next/navigation";
import {
  ProjectComplexity,
  ProjectPriority,
  ProjectStatus,
  ProjectVisibility,
} from "@prisma/client";
import { createProjectAction } from "@/server/actions/projects";
import {
  projectComplexityLabels,
  projectPriorityLabels,
  projectStatusLabels,
  projectVisibilityLabels,
} from "@/lib/domain";

type ProjectQuickCreateCardProps = {
  cancelHref: string;
  currentUserId: string;
  users: Array<{
    id: string;
    name: string;
  }>;
  teams: Array<{
    id: string;
    name: string;
  }>;
};

type ProjectCreateFormState = {
  name: string;
  ownerId: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  complexity: ProjectComplexity;
  visibility: ProjectVisibility;
  teamId: string;
  dueDate: string;
  description: string;
};

export function ProjectQuickCreateCard({
  cancelHref,
  currentUserId,
  users,
  teams,
}: ProjectQuickCreateCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [form, setForm] = useState<ProjectCreateFormState>({
    name: "",
    ownerId: currentUserId,
    status: ProjectStatus.PLANNING,
    priority: ProjectPriority.MEDIUM,
    complexity: ProjectComplexity.MEDIUM,
    visibility: ProjectVisibility.WORKSPACE,
    teamId: "",
    dueDate: "",
    description: "",
  });

  const handleClose = () => {
    router.replace(cancelHref, { scroll: false });
  };

  const handleSubmit = () => {
    setError(null);

    startTransition(async () => {
      const result = await createProjectAction({
        name: form.name,
        ownerId: form.ownerId,
        status: form.status,
        priority: form.priority,
        complexity: form.complexity,
        visibility: form.visibility,
        teamId: form.teamId || null,
        dueDate: form.dueDate || null,
        description: form.description,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      router.push(`/projects/${result.projectId}`);
      router.refresh();
    });
  };

  return (
    <Dialog
      open
      onClose={handleClose}
      fullWidth
      maxWidth="md"
      slotProps={{
        paper: {
          sx: {
            borderRadius: 7,
          },
        },
      }}
    >
      <DialogTitle sx={{ px: { xs: 2.5, md: 3 }, pt: { xs: 2.5, md: 3 } }}>
        <Stack spacing={0.9}>
          <Typography variant="overline" sx={{ color: "secondary.main", letterSpacing: "0.16em" }}>
            Criação rápida
          </Typography>
          <Box>
            <Typography variant="h3">Novo projeto</Typography>
            <Typography color="text.secondary" sx={{ mt: 0.65 }}>
              O mínimo útil primeiro. As propriedades menos frequentes ficam recolhidas.
            </Typography>
          </Box>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ px: { xs: 2.5, md: 3 }, pb: 0 }}>
        <Stack spacing={2}>
          {error ? <Alert severity="error">{error}</Alert> : null}

          <TextField
            autoFocus
            label="Nome do projeto"
            placeholder="Ex.: Plataforma web do TCC"
            value={form.name}
            onChange={(event) =>
              setForm((current) => ({ ...current, name: event.target.value }))
            }
          />

          <Box
            sx={{
              display: "grid",
              gap: 1.25,
              gridTemplateColumns: {
                xs: "1fr",
                md: "repeat(3, minmax(0, 1fr))",
              },
            }}
          >
            <TextField
              label="Responsável"
              select
              value={form.ownerId}
              onChange={(event) =>
                setForm((current) => ({ ...current, ownerId: event.target.value }))
              }
            >
              {users.map((user) => (
                <MenuItem key={user.id} value={user.id}>
                  {user.name}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Equipe"
              select
              value={form.teamId}
              onChange={(event) =>
                setForm((current) => ({ ...current, teamId: event.target.value }))
              }
            >
              <MenuItem value="">Sem equipe</MenuItem>
              {teams.map((team) => (
                <MenuItem key={team.id} value={team.id}>
                  {team.name}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Prazo"
              type="date"
              value={form.dueDate}
              onChange={(event) =>
                setForm((current) => ({ ...current, dueDate: event.target.value }))
              }
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Box>

          <TextField
            label="Descrição"
            multiline
            minRows={3}
            placeholder="Contexto, objetivo e expectativa principal do projeto."
            value={form.description}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                description: event.target.value,
              }))
            }
          />

          <Box>
            <Button
              onClick={() => setShowAdvanced((current) => !current)}
              variant="text"
              startIcon={<TuneRounded />}
              endIcon={
                <ExpandMoreRounded
                  sx={{
                    transition: "transform 180ms ease",
                    transform: showAdvanced ? "rotate(180deg)" : "rotate(0deg)",
                  }}
                />
              }
              sx={{ px: 0 }}
            >
              Mais propriedades
            </Button>
            <Collapse in={showAdvanced} timeout={180}>
              <Box
                sx={{
                  display: "grid",
                  gap: 1.25,
                  gridTemplateColumns: {
                    xs: "1fr",
                    md: "repeat(2, minmax(0, 1fr))",
                  },
                  mt: 1.25,
                }}
              >
                <TextField
                  label="Status"
                  select
                  value={form.status}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      status: event.target.value as ProjectStatus,
                    }))
                  }
                >
                  {Object.entries(projectStatusLabels).map(([value, label]) => (
                    <MenuItem key={value} value={value}>
                      {label}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  label="Prioridade"
                  select
                  value={form.priority}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      priority: event.target.value as ProjectPriority,
                    }))
                  }
                >
                  {Object.entries(projectPriorityLabels).map(([value, label]) => (
                    <MenuItem key={value} value={value}>
                      {label}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  label="Complexidade"
                  select
                  value={form.complexity}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      complexity: event.target.value as ProjectComplexity,
                    }))
                  }
                >
                  {Object.entries(projectComplexityLabels).map(([value, label]) => (
                    <MenuItem key={value} value={value}>
                      {label}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  label="Visibilidade"
                  select
                  value={form.visibility}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      visibility: event.target.value as ProjectVisibility,
                    }))
                  }
                >
                  {Object.entries(projectVisibilityLabels).map(([value, label]) => (
                    <MenuItem key={value} value={value}>
                      {label}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>
            </Collapse>
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: { xs: 2.5, md: 3 }, py: { xs: 2, md: 2.5 } }}>
        <Button onClick={handleClose} variant="outlined">
          Cancelar
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={isPending}>
          {isPending ? "Criando..." : "Criar projeto"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
