"use client";

import { useState, useTransition } from "react";
import { ExpandMoreRounded, TuneRounded } from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Collapse,
  ListItemText,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import Link from "next/link";
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

type ProjectTaskComposerProps = {
  cancelHref: string;
  project: {
    id: string;
    sprints: Array<{
      id: string;
      name: string;
    }>;
    tasks: Array<{
      id: string;
      code: string;
      title: string;
    }>;
  };
  users: Array<{
    id: string;
    name: string;
  }>;
};

type TaskCreateFormState = {
  title: string;
  assigneeIds: string[];
  dependencyIds: string[];
  status: TaskStatus;
  priority: TaskPriority;
  type: TaskType;
  visibility: TaskVisibility;
  blocked: boolean;
  sprintId: string;
  dueDate: string;
  description: string;
};

export function ProjectTaskComposer({
  cancelHref,
  project,
  users,
}: ProjectTaskComposerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [form, setForm] = useState<TaskCreateFormState>({
    title: "",
    assigneeIds: [],
    dependencyIds: [],
    status: TaskStatus.TODO,
    priority: TaskPriority.MEDIUM,
    type: TaskType.FEATURE,
    visibility: TaskVisibility.PROJECT,
    blocked: false,
    sprintId: "",
    dueDate: "",
    description: "",
  });

  const handleSubmit = () => {
    setError(null);

    startTransition(async () => {
      const result = await createTaskAction({
        title: form.title,
        projectId: project.id,
        sprintId: form.sprintId || null,
        assigneeIds: form.assigneeIds,
        dependencyIds: form.dependencyIds,
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
    <Box
      sx={{
        p: { xs: 2, md: 2.5 },
        borderRadius: 5,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "action.hover",
      }}
    >
      <Stack spacing={2}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          spacing={{ xs: 1.5, md: 2 }}
          alignItems={{ xs: "stretch", md: "flex-start" }}
        >
          <Stack spacing={0.75} sx={{ maxWidth: 640 }}>
            <Typography variant="overline" sx={{ color: "secondary.main", letterSpacing: "0.14em" }}>
              Nova tarefa
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Crie uma tarefa já vinculada a este projeto e acompanhe o andamento no painel lateral.
            </Typography>
          </Stack>

          <Stack
            direction="row"
            spacing={1}
            useFlexGap
            flexWrap="wrap"
            justifyContent={{ xs: "stretch", sm: "flex-end" }}
            sx={{ alignSelf: { xs: "stretch", md: "flex-start" } }}
          >
            <Button
              component={Link}
              href={cancelHref}
              variant="outlined"
              size="small"
              sx={{ minWidth: { xs: "100%", sm: 0 } }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              variant="contained"
              size="small"
              disabled={isPending}
              sx={{ minWidth: { xs: "100%", sm: 0 } }}
            >
              {isPending ? "Criando..." : "Criar tarefa"}
            </Button>
          </Stack>
        </Stack>

        {error ? <Alert severity="error">{error}</Alert> : null}

        <TextField
          autoFocus
          size="small"
          label="Título"
          placeholder="Ex.: Ajustar cronograma das entregas"
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
              lg: "repeat(3, minmax(0, 1fr))",
            },
          }}
        >
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
            {project.sprints.map((sprint) => (
              <MenuItem key={sprint.id} value={sprint.id}>
                {sprint.name}
              </MenuItem>
            ))}
          </TextField>

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
            Mais detalhes
          </Button>

          <Collapse in={showAdvanced} timeout={180}>
            <Stack spacing={1.5} sx={{ mt: 1.5 }}>
              <Box
                sx={{
                  display: "grid",
                  gap: 1.5,
                  gridTemplateColumns: {
                    xs: "1fr",
                    lg: "repeat(3, minmax(0, 1fr))",
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
                size="small"
                label="Dependências"
                select
                SelectProps={{
                  multiple: true,
                  renderValue: (selected) =>
                    (selected as string[])
                      .map((taskId) => {
                        const dependency = project.tasks.find((task) => task.id === taskId);

                        return dependency
                          ? `${dependency.code} · ${dependency.title}`
                          : "Tarefa";
                      })
                      .join(", "),
                }}
                value={form.dependencyIds}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    dependencyIds: event.target.value as unknown as string[],
                  }))
                }
              >
                {project.tasks.map((task) => (
                  <MenuItem key={task.id} value={task.id}>
                    <Checkbox checked={form.dependencyIds.includes(task.id)} />
                    <ListItemText primary={task.title} secondary={task.code} />
                  </MenuItem>
                ))}
              </TextField>

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
    </Box>
  );
}
