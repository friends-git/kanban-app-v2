"use client";

import { useMemo, useState, useTransition } from "react";
import { ExpandMoreRounded, TuneRounded } from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  ListItemText,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useRouter } from "next/navigation";
import {
  TaskPriority,
  TaskStatus,
  TaskType,
  TaskVisibility,
} from "@prisma/client";
import { createTaskAction } from "@/server/actions/tasks";
import {
  taskPriorityLabels,
  taskStatusLabels,
  taskTypeLabels,
  taskVisibilityLabels,
} from "@/lib/domain";

type TaskQuickCreateDialogProps = {
  cancelHref: string;
  projects: Array<{
    id: string;
    name: string;
    sprints: Array<{
      id: string;
      name: string;
    }>;
  }>;
  users: Array<{
    id: string;
    name: string;
  }>;
};

type TaskCreateFormState = {
  title: string;
  projectId: string;
  sprintId: string;
  assigneeIds: string[];
  status: TaskStatus;
  priority: TaskPriority;
  type: TaskType;
  visibility: TaskVisibility;
  blocked: boolean;
  dueDate: string;
  description: string;
};

export function TaskQuickCreateDialog({
  cancelHref,
  projects,
  users,
}: TaskQuickCreateDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [form, setForm] = useState<TaskCreateFormState>({
    title: "",
    projectId: projects[0]?.id ?? "",
    sprintId: "",
    assigneeIds: [],
    status: TaskStatus.TODO,
    priority: TaskPriority.MEDIUM,
    type: TaskType.FEATURE,
    visibility: TaskVisibility.PROJECT,
    blocked: false,
    dueDate: "",
    description: "",
  });

  const currentProject = useMemo(() => {
    return projects.find((project) => project.id === form.projectId) ?? null;
  }, [form.projectId, projects]);

  const handleClose = () => {
    router.replace(cancelHref, { scroll: false });
  };

  const handleSubmit = () => {
    setError(null);

    startTransition(async () => {
      const result = await createTaskAction({
        title: form.title,
        projectId: form.projectId,
        sprintId: form.sprintId || null,
        assigneeIds: form.assigneeIds,
        status: form.status,
        priority: form.priority,
        type: form.type,
        visibility: form.visibility,
        blocked: form.blocked,
        dueDate: form.dueDate || null,
        description: form.description,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      router.push(
        `${cancelHref}${cancelHref.includes("?") ? "&" : "?"}taskId=${result.taskId}`,
      );
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
            <Typography variant="h3">Nova tarefa</Typography>
            <Typography color="text.secondary" sx={{ mt: 0.65 }}>
              Database-first: título, projeto e prazo primeiro. O restante fica recolhido.
            </Typography>
          </Box>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ px: { xs: 2.5, md: 3 }, pb: 0 }}>
        <Stack spacing={2.25}>
          {error ? <Alert severity="error">{error}</Alert> : null}

          <TextField
            autoFocus
            size="small"
            label="Título"
            placeholder="Ex.: Refinar database global de tarefas"
            value={form.title}
            onChange={(event) =>
              setForm((current) => ({ ...current, title: event.target.value }))
            }
          />

          <Box
            sx={{
              display: "grid",
              gap: 1.5,
              gridTemplateColumns: {
                xs: "1fr",
                md: "repeat(3, minmax(0, 1fr))",
              },
            }}
          >
            <TextField
              size="small"
              label="Projeto"
              select
              value={form.projectId}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  projectId: event.target.value,
                  sprintId: "",
                }))
              }
            >
              {projects.map((project) => (
                <MenuItem key={project.id} value={project.id}>
                  {project.name}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              size="small"
              label="Sprint"
              select
              value={form.sprintId}
              onChange={(event) =>
                setForm((current) => ({ ...current, sprintId: event.target.value }))
              }
            >
              <MenuItem value="">Sem sprint</MenuItem>
              {(currentProject?.sprints ?? []).map((sprint) => (
                <MenuItem key={sprint.id} value={sprint.id}>
                  {sprint.name}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              size="small"
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
            size="small"
            label="Responsáveis"
            select
            SelectProps={{
              multiple: true,
              renderValue: (selected) =>
                (selected as string[])
                  .map((id) => users.find((user) => user.id === id)?.name ?? "Pessoa")
                  .join(", "),
            }}
            value={form.assigneeIds}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                assigneeIds: event.target.value as unknown as string[],
              }))
            }
          >
            {users.map((user) => (
              <MenuItem key={user.id} value={user.id}>
                <Checkbox checked={form.assigneeIds.includes(user.id)} />
                <ListItemText primary={user.name} />
              </MenuItem>
            ))}
          </TextField>

          <Box sx={{ pt: 0.25 }}>
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
              <Stack spacing={1.5} sx={{ mt: 1.5 }}>
                <Box
                  sx={{
                    display: "grid",
                    gap: 1.5,
                    gridTemplateColumns: {
                      xs: "1fr",
                      md: "repeat(3, minmax(0, 1fr))",
                    },
                  }}
                >
                  <TextField
                    size="small"
                    label="Status"
                    select
                    value={form.status}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        status: event.target.value as TaskStatus,
                      }))
                    }
                  >
                    {Object.entries(taskStatusLabels).map(([value, label]) => (
                      <MenuItem key={value} value={value}>
                        {label}
                      </MenuItem>
                    ))}
                  </TextField>

                  <TextField
                    size="small"
                    label="Prioridade"
                    select
                    value={form.priority}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        priority: event.target.value as TaskPriority,
                      }))
                    }
                  >
                    {Object.entries(taskPriorityLabels).map(([value, label]) => (
                      <MenuItem key={value} value={value}>
                        {label}
                      </MenuItem>
                    ))}
                  </TextField>

                  <TextField
                    size="small"
                    label="Tipo"
                    select
                    value={form.type}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        type: event.target.value as TaskType,
                      }))
                    }
                  >
                    {Object.entries(taskTypeLabels).map(([value, label]) => (
                      <MenuItem key={value} value={value}>
                        {label}
                      </MenuItem>
                    ))}
                  </TextField>

                  <TextField
                    size="small"
                    label="Visibilidade"
                    select
                    value={form.visibility}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        visibility: event.target.value as TaskVisibility,
                      }))
                    }
                  >
                    {Object.entries(taskVisibilityLabels).map(([value, label]) => (
                      <MenuItem key={value} value={value}>
                        {label}
                      </MenuItem>
                    ))}
                  </TextField>

                  <TextField
                    size="small"
                    label="Bloqueio"
                    select
                    value={form.blocked ? "yes" : "no"}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        blocked: event.target.value === "yes",
                      }))
                    }
                  >
                    <MenuItem value="no">Sem bloqueio</MenuItem>
                    <MenuItem value="yes">Bloqueada</MenuItem>
                  </TextField>
                </Box>

                <TextField
                  label="Descrição"
                  multiline
                  minRows={3}
                  placeholder="Contexto e resultado esperado da tarefa."
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                />
              </Stack>
            </Collapse>
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions
        sx={{
          px: { xs: 2.5, md: 3 },
          py: { xs: 2, md: 2.5 },
          gap: 1,
        }}
      >
        <Button onClick={handleClose} variant="outlined">
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={isPending || !form.projectId}
        >
          {isPending ? "Criando..." : "Criar tarefa"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
