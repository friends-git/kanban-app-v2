"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  AddRounded,
  CloseRounded,
  DeleteOutlineRounded,
} from "@mui/icons-material";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Checkbox,
  Divider,
  IconButton,
  LinearProgress,
  ListItemText,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  TaskPriority,
  TaskStatus,
  TaskType,
  TaskVisibility,
} from "@prisma/client";
import { useRouter } from "next/navigation";
import { AvatarStack } from "@/components/ui/avatar-stack";
import { PriorityBadge } from "@/components/ui/priority-badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { TagChip } from "@/components/ui/tag-chip";
import {
  addTaskCommentAction,
  createChecklistItemAction,
  deleteChecklistItemAction,
  toggleChecklistItemAction,
  updateChecklistItemAction,
  updateTaskAction,
} from "@/server/actions/tasks";
import {
  taskPriorityLabels,
  taskStatusLabels,
  taskTypeLabels,
  taskVisibilityLabels,
} from "@/lib/domain";
import {
  formatDateInput,
  formatFullDate,
  formatRelativeDate,
} from "@/lib/formatters";

export type TaskDetailData = {
  id: string;
  code: string;
  title: string;
  summary: string | null;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  type: TaskType;
  visibility: TaskVisibility;
  blocked: boolean;
  dueDate: Date | string | null;
  startDate: Date | string | null;
  sprintId: string | null;
  sprintName: string | null;
  projectId: string;
  projectName: string;
  assignees: Array<{
    id: string;
    name: string;
    avatarColor?: string | null;
  }>;
  checklistItems: Array<{
    id: string;
    content: string;
    done: boolean;
  }>;
  comments: Array<{
    id: string;
    content: string;
    createdAt?: string | null;
    author: {
      id: string;
      name: string;
      avatarColor?: string | null;
    };
  }>;
  tags: Array<{
    id: string;
    name: string;
    color: string;
  }>;
};

type TaskDetailContentProps = {
  task: TaskDetailData;
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
    avatarColor?: string | null;
  }>;
  canManage: boolean;
  canComment: boolean;
  onClose?: () => void;
  variant?: "drawer" | "page";
};

type TaskFormState = {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  type: TaskType;
  visibility: TaskVisibility;
  blocked: boolean;
  dueDate: string;
  projectId: string;
  sprintId: string;
  assigneeIds: string[];
};

function getInitialFormState(task: TaskDetailData): TaskFormState {
  return {
    title: task.title,
    description: task.description ?? "",
    status: task.status,
    priority: task.priority,
    type: task.type,
    visibility: task.visibility,
    blocked: task.blocked,
    dueDate: formatDateInput(task.dueDate),
    projectId: task.projectId,
    sprintId: task.sprintId ?? "",
    assigneeIds: task.assignees.map((assignee) => assignee.id),
  };
}

export function TaskDetailContent({
  task,
  projects,
  users,
  canManage,
  canComment,
  onClose,
  variant = "drawer",
}: TaskDetailContentProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(
    null,
  );
  const [newChecklistItem, setNewChecklistItem] = useState("");
  const [newComment, setNewComment] = useState("");
  const [form, setForm] = useState<TaskFormState>(() => getInitialFormState(task));

  useEffect(() => {
    setForm(getInitialFormState(task));
    setMessage(null);
    setNewChecklistItem("");
    setNewComment("");
  }, [task]);

  const currentProject = useMemo(() => {
    return projects.find((projectOption) => projectOption.id === form.projectId) ?? null;
  }, [form.projectId, projects]);

  useEffect(() => {
    if (form.sprintId && !currentProject?.sprints.some((sprint) => sprint.id === form.sprintId)) {
      setForm((current) => ({ ...current, sprintId: "" }));
    }
  }, [currentProject, form.sprintId]);

  const checklistDoneCount = task.checklistItems.filter((item) => item.done).length;
  const checklistProgress = task.checklistItems.length
    ? Math.round((checklistDoneCount / task.checklistItems.length) * 100)
    : 0;

  const handleSave = () => {
    setMessage(null);

    startTransition(async () => {
      const result = await updateTaskAction({
        id: task.id,
        title: form.title,
        description: form.description,
        status: form.status,
        priority: form.priority,
        type: form.type,
        visibility: form.visibility,
        blocked: form.blocked,
        dueDate: form.dueDate || null,
        projectId: form.projectId,
        sprintId: form.sprintId || null,
        assigneeIds: form.assigneeIds,
      });

      if (!result.ok) {
        setMessage({ type: "error", text: result.error });
        return;
      }

      setMessage({ type: "success", text: "Tarefa atualizada." });
      router.refresh();
    });
  };

  const handleChecklistCreate = () => {
    if (!newChecklistItem.trim()) {
      return;
    }

    setMessage(null);

    startTransition(async () => {
      const result = await createChecklistItemAction({
        taskId: task.id,
        content: newChecklistItem,
      });

      if (!result.ok) {
        setMessage({ type: "error", text: result.error });
        return;
      }

      setNewChecklistItem("");
      router.refresh();
    });
  };

  const handleChecklistToggle = (itemId: string, done: boolean) => {
    startTransition(async () => {
      const result = await toggleChecklistItemAction({
        taskId: task.id,
        itemId,
        done,
      });

      if (!result.ok) {
        setMessage({ type: "error", text: result.error });
        return;
      }

      router.refresh();
    });
  };

  const handleChecklistUpdate = (itemId: string, content: string) => {
    if (!content.trim()) {
      return;
    }

    startTransition(async () => {
      const result = await updateChecklistItemAction({
        taskId: task.id,
        itemId,
        content,
      });

      if (!result.ok) {
        setMessage({ type: "error", text: result.error });
        return;
      }

      router.refresh();
    });
  };

  const handleChecklistDelete = (itemId: string) => {
    startTransition(async () => {
      const result = await deleteChecklistItemAction({
        taskId: task.id,
        itemId,
      });

      if (!result.ok) {
        setMessage({ type: "error", text: result.error });
        return;
      }

      router.refresh();
    });
  };

  const handleCommentCreate = () => {
    if (!newComment.trim()) {
      return;
    }

    setMessage(null);

    startTransition(async () => {
      const result = await addTaskCommentAction({
        taskId: task.id,
        content: newComment,
      });

      if (!result.ok) {
        setMessage({ type: "error", text: result.error });
        return;
      }

      setNewComment("");
      router.refresh();
    });
  };

  return (
    <Stack
      spacing={3}
      sx={{
        p: variant === "drawer" ? { xs: 2.5, md: 3.25 } : 0,
        height: "100%",
        overflowY: "auto",
      }}
    >
      <Stack
        direction="row"
        justifyContent="space-between"
        spacing={2}
        sx={{ pb: 2.5, borderBottom: "1px solid", borderColor: "divider" }}
      >
        <Box>
          <Typography
            variant="overline"
            sx={{ color: "secondary.main", letterSpacing: "0.16em" }}
          >
            {task.projectName} • {task.code}
          </Typography>
          {canManage ? (
            <TextField
              fullWidth
              variant="standard"
              value={form.title}
              onChange={(event) =>
                setForm((current) => ({ ...current, title: event.target.value }))
              }
              sx={{
                mt: 0.5,
                "& .MuiInputBase-input": {
                  fontSize: "1.5rem",
                  fontWeight: 800,
                  letterSpacing: "-0.04em",
                },
              }}
            />
          ) : (
            <Typography variant="h3" sx={{ mt: 0.75 }}>
              {task.title}
            </Typography>
          )}
          <Typography color="text.secondary" sx={{ mt: 1.1, maxWidth: 420 }}>
            {task.summary ?? "Sem resumo"}
          </Typography>
        </Box>

        {onClose ? (
          <IconButton onClick={onClose}>
            <CloseRounded />
          </IconButton>
        ) : null}
      </Stack>

      {message ? <Alert severity={message.type}>{message.text}</Alert> : null}

      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
        <StatusBadge status={task.status} />
        <PriorityBadge priority={task.priority} />
        {task.tags.map((tag) => (
          <TagChip key={tag.id} label={tag.name} color={tag.color} />
        ))}
      </Stack>

      <Box
        sx={{
          p: 2.25,
          borderRadius: 4.5,
          border: "1px solid",
          borderColor: "divider",
          bgcolor: "action.hover",
        }}
      >
        <Stack spacing={1.25}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            spacing={1.5}
          >
            <Typography fontWeight={700}>Progresso do checklist</Typography>
            <Typography color="text.secondary" variant="body2">
              {task.checklistItems.length
                ? `${checklistDoneCount}/${task.checklistItems.length} itens`
                : "Nenhum item"}
            </Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={task.checklistItems.length ? checklistProgress : 0}
            color="secondary"
            sx={{ height: 10, borderRadius: 999 }}
          />
        </Stack>
      </Box>

      <Box
        sx={{
          p: 2.25,
          borderRadius: 4.5,
          border: "1px solid",
          borderColor: "divider",
          bgcolor: "action.hover",
        }}
      >
        {canManage ? (
          <TextField
            label="Descrição"
            multiline
            minRows={4}
            value={form.description}
            onChange={(event) =>
              setForm((current) => ({ ...current, description: event.target.value }))
            }
            sx={{
              width: "100%",
              "& .MuiOutlinedInput-root": {
                bgcolor: "background.paper",
              },
            }}
          />
        ) : (
          <Typography color="text.secondary">
            {task.description ?? "Esta tarefa ainda não tem descrição detalhada."}
          </Typography>
        )}
      </Box>

      <DrawerSection title="Propriedades">
        <Box
          sx={{
            borderRadius: 5,
            border: "1px solid",
            borderColor: "divider",
            bgcolor: "background.paper",
            p: 0.5,
          }}
        >
          <Stack
            sx={{
              borderRadius: 4,
              overflow: "hidden",
              bgcolor: "background.paper",
            }}
          >
            <PropertyField label="Projeto">
              {canManage ? (
                <TextField
                  fullWidth
                  select
                  value={form.projectId}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, projectId: event.target.value }))
                  }
                >
                  {projects.map((projectOption) => (
                    <MenuItem key={projectOption.id} value={projectOption.id}>
                      {projectOption.name}
                    </MenuItem>
                  ))}
                </TextField>
              ) : (
                <Typography fontWeight={700}>{task.projectName}</Typography>
              )}
            </PropertyField>

            <PropertyField label="Sprint">
              {canManage ? (
                <TextField
                  fullWidth
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
              ) : (
                <Typography fontWeight={700}>{task.sprintName ?? "Sem sprint"}</Typography>
              )}
            </PropertyField>

            <PropertyField label="Status">
              {canManage ? (
                <TextField
                  fullWidth
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
              ) : (
                <StatusBadge status={task.status} />
              )}
            </PropertyField>

            <PropertyField label="Prioridade">
              {canManage ? (
                <TextField
                  fullWidth
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
              ) : (
                <PriorityBadge priority={task.priority} />
              )}
            </PropertyField>

            <PropertyField label="Tipo">
              {canManage ? (
                <TextField
                  fullWidth
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
              ) : (
                <Typography fontWeight={700}>{taskTypeLabels[task.type]}</Typography>
              )}
            </PropertyField>

            <PropertyField label="Visibilidade">
              {canManage ? (
                <TextField
                  fullWidth
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
              ) : (
                <Typography fontWeight={700}>
                  {taskVisibilityLabels[task.visibility]}
                </Typography>
              )}
            </PropertyField>

            <PropertyField label="Prazo">
              {canManage ? (
                <TextField
                  fullWidth
                  type="date"
                  value={form.dueDate}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, dueDate: event.target.value }))
                  }
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              ) : (
                <Stack spacing={0.25}>
                  <Typography fontWeight={700}>{formatFullDate(task.dueDate)}</Typography>
                  <Typography color="text.secondary" variant="caption">
                    {formatRelativeDate(task.dueDate)}
                  </Typography>
                </Stack>
              )}
            </PropertyField>

            <PropertyField label="Bloqueio">
              {canManage ? (
                <TextField
                  fullWidth
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
              ) : (
                <Typography fontWeight={700}>
                  {task.blocked ? "Bloqueada" : "Sem bloqueio"}
                </Typography>
              )}
            </PropertyField>

            <PropertyField label="Responsáveis">
              {canManage ? (
                <TextField
                  fullWidth
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
              ) : (
                <AvatarStack items={task.assignees} max={5} />
              )}
            </PropertyField>

            <PropertyField label="Início">
              <Typography fontWeight={700}>{formatFullDate(task.startDate)}</Typography>
            </PropertyField>
          </Stack>
        </Box>

        {canManage ? (
          <Stack direction="row" justifyContent="flex-end">
            <Button onClick={handleSave} variant="contained" disabled={isPending}>
              {isPending ? "Salvando..." : "Salvar alterações"}
            </Button>
          </Stack>
        ) : null}
      </DrawerSection>

      <DrawerSection title="Checklist">
        <Stack spacing={1.25}>
          {task.checklistItems.length ? (
            task.checklistItems.map((item) => (
              <Box
                key={`${item.id}:${item.content}:${item.done}`}
                sx={{
                  display: "grid",
                  gap: 1,
                  gridTemplateColumns: canManage
                    ? "auto minmax(0, 1fr) auto"
                    : "auto minmax(0, 1fr)",
                  alignItems: "center",
                  p: 1.25,
                  borderRadius: 4,
                  border: "1px solid",
                  borderColor: "divider",
                  bgcolor: "action.hover",
                }}
              >
                <Checkbox
                  checked={item.done}
                  disabled={!canManage || isPending}
                  onChange={(event) =>
                    handleChecklistToggle(item.id, event.target.checked)
                  }
                />
                {canManage ? (
                  <TextField
                    fullWidth
                    defaultValue={item.content}
                    onBlur={(event) => {
                      const value = event.target.value.trim();
                      if (value && value !== item.content) {
                        handleChecklistUpdate(item.id, value);
                      }
                    }}
                  />
                ) : (
                  <Typography
                    sx={{
                      textDecoration: item.done ? "line-through" : "none",
                      color: item.done ? "text.secondary" : "text.primary",
                    }}
                  >
                    {item.content}
                  </Typography>
                )}
                {canManage ? (
                  <IconButton
                    onClick={() => handleChecklistDelete(item.id)}
                    disabled={isPending}
                  >
                    <DeleteOutlineRounded />
                  </IconButton>
                ) : null}
              </Box>
            ))
          ) : (
            <Typography color="text.secondary">Nenhum item no checklist.</Typography>
          )}

          {canManage ? (
            <Stack direction="row" spacing={1}>
              <TextField
                fullWidth
                placeholder="Adicionar item"
                value={newChecklistItem}
                onChange={(event) => setNewChecklistItem(event.target.value)}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    bgcolor: "background.paper",
                  },
                }}
              />
              <Button
                onClick={handleChecklistCreate}
                variant="outlined"
                disabled={isPending || !newChecklistItem.trim()}
                startIcon={<AddRounded />}
              >
                Adicionar
              </Button>
            </Stack>
          ) : null}
        </Stack>
      </DrawerSection>

      <DrawerSection title="Comentários">
        <Stack spacing={1.25}>
          {task.comments.length ? (
            task.comments.map((comment, index) => (
              <Box key={comment.id}>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 4,
                    border: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    spacing={1.25}
                    sx={{ mb: 1 }}
                  >
                    <Stack direction="row" spacing={1.25} alignItems="center">
                      <Avatar
                        sx={{
                          width: 32,
                          height: 32,
                          bgcolor: comment.author.avatarColor ?? "secondary.main",
                        }}
                      >
                        {comment.author.name.charAt(0)}
                      </Avatar>
                      <Typography fontWeight={700}>{comment.author.name}</Typography>
                    </Stack>
                    {comment.createdAt ? (
                      <Typography color="text.secondary" variant="caption">
                        {formatRelativeDate(comment.createdAt)}
                      </Typography>
                    ) : null}
                  </Stack>
                  <Typography color="text.secondary">{comment.content}</Typography>
                </Box>
                {index < task.comments.length - 1 ? <Divider sx={{ mt: 1.25 }} /> : null}
              </Box>
            ))
          ) : (
            <Typography color="text.secondary">Nenhum comentário ainda.</Typography>
          )}

          {canComment ? (
            <Stack
              spacing={1}
              sx={{
                p: 1.5,
                borderRadius: 5,
                border: "1px solid",
                borderColor: "divider",
                bgcolor: "action.hover",
              }}
            >
              <TextField
                fullWidth
                multiline
                minRows={3}
                placeholder="Adicionar comentário"
                value={newComment}
                onChange={(event) => setNewComment(event.target.value)}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    bgcolor: "background.paper",
                  },
                }}
              />
              <Stack direction="row" justifyContent="flex-end">
                <Button
                  onClick={handleCommentCreate}
                  variant="outlined"
                  disabled={isPending || !newComment.trim()}
                >
                  Comentar
                </Button>
              </Stack>
            </Stack>
          ) : null}
        </Stack>
      </DrawerSection>
    </Stack>
  );
}

function DrawerSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Stack spacing={1.4}>
      <Typography
        color="text.secondary"
        variant="overline"
        sx={{ letterSpacing: "0.16em" }}
      >
        {title}
      </Typography>
      {children}
    </Stack>
  );
}

function PropertyField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "120px minmax(0, 1fr)" },
        gap: 1.75,
        alignItems: "center",
        px: 2.25,
        py: 1.45,
        borderBottom: "1px solid",
        borderColor: "divider",
        "&:last-of-type": {
          borderBottom: "none",
        },
      }}
    >
      <Typography color="text.secondary" variant="body2">
        {label}
      </Typography>
      <Box sx={{ minWidth: 0 }}>{children}</Box>
    </Box>
  );
}
