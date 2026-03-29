"use client";

import { useMemo, useState, useTransition } from "react";
import {
  ExpandMoreRounded,
  GroupAddRounded,
  TuneRounded,
} from "@mui/icons-material";
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
import { createTeamAction } from "@/server/actions/teams";

type TeamQuickCreateDialogProps = {
  currentUserId: string;
  currentUserName: string;
  users: Array<{
    id: string;
    name: string;
  }>;
};

type TeamCreateFormState = {
  name: string;
  summary: string;
  focus: string;
  memberIds: string[];
  leadIds: string[];
};

export function TeamQuickCreateDialog({
  currentUserId,
  currentUserName,
  users,
}: TeamQuickCreateDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [form, setForm] = useState<TeamCreateFormState>({
    name: "",
    summary: "",
    focus: "",
    memberIds: [],
    leadIds: [],
  });

  const memberOptions = useMemo(() => {
    return users.filter((user) => user.id !== currentUserId);
  }, [currentUserId, users]);

  const leadOptions = useMemo(() => {
    const selectedMembers = new Set(form.memberIds);
    return memberOptions.filter((user) => selectedMembers.has(user.id));
  }, [form.memberIds, memberOptions]);

  const resetForm = () => {
    setError(null);
    setShowAdvanced(false);
    setForm({
      name: "",
      summary: "",
      focus: "",
      memberIds: [],
      leadIds: [],
    });
  };

  const handleClose = () => {
    setOpen(false);
    resetForm();
  };

  const handleSubmit = () => {
    setError(null);

    startTransition(async () => {
      const result = await createTeamAction({
        name: form.name,
        summary: form.summary,
        focus: form.focus,
        memberIds: form.memberIds,
        leadIds: form.leadIds,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      handleClose();
      router.refresh();
    });
  };

  return (
    <>
      <Button
        variant="contained"
        startIcon={<GroupAddRounded />}
        onClick={() => setOpen(true)}
      >
        Nova equipe
      </Button>

      <Dialog
        open={open}
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
            <Typography
              variant="overline"
              sx={{ color: "secondary.main", letterSpacing: "0.16em" }}
            >
              Organização do grupo
            </Typography>
            <Box>
              <Typography variant="h3">Nova equipe</Typography>
              <Typography color="text.secondary" sx={{ mt: 0.65 }}>
                Crie uma frente do Rolezito com nome, escopo e pessoas responsáveis.
              </Typography>
            </Box>
          </Stack>
        </DialogTitle>

        <DialogContent sx={{ px: { xs: 2.5, md: 3 }, pb: 0 }}>
          <Stack spacing={2.25}>
            {error ? <Alert severity="error">{error}</Alert> : null}

            <TextField
              autoFocus
              label="Nome da equipe"
              placeholder="Ex.: Produto e pesquisa"
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
            />

            <TextField
              label="Resumo"
              multiline
              minRows={3}
              placeholder="Explique rapidamente o papel desta equipe no desenvolvimento do Rolezito."
              value={form.summary}
              onChange={(event) =>
                setForm((current) => ({ ...current, summary: event.target.value }))
              }
            />

            <TextField
              label="Participantes"
              select
              SelectProps={{
                multiple: true,
                displayEmpty: true,
                renderValue: (selected) => {
                  const ids = selected as string[];

                  if (!ids.length) {
                    return `${currentUserName} (apenas você, por enquanto)`;
                  }

                  return ids
                    .map((id) => memberOptions.find((user) => user.id === id)?.name ?? "Pessoa")
                    .join(", ");
                },
              }}
              value={form.memberIds}
              onChange={(event) =>
                setForm((current) => {
                  const memberIds = event.target.value as unknown as string[];
                  return {
                    ...current,
                    memberIds,
                    leadIds: current.leadIds.filter((leadId) => memberIds.includes(leadId)),
                  };
                })
              }
              helperText={`${currentUserName} entra automaticamente como liderança inicial.`}
            >
              {memberOptions.map((user) => (
                <MenuItem key={user.id} value={user.id}>
                  <Checkbox checked={form.memberIds.includes(user.id)} />
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
                Mais detalhes
              </Button>

              <Collapse in={showAdvanced} timeout={180}>
                <Stack spacing={1.5} sx={{ mt: 1.5 }}>
                  <TextField
                    label="Foco da equipe"
                    placeholder="Ex.: UX, implementação full-stack e alinhamento de entregas"
                    value={form.focus}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, focus: event.target.value }))
                    }
                  />

                  <TextField
                    label="Lideranças adicionais"
                    select
                    SelectProps={{
                      multiple: true,
                      displayEmpty: true,
                      renderValue: (selected) => {
                        const ids = selected as string[];

                        if (!ids.length) {
                          return "Sem lideranças adicionais";
                        }

                        return ids
                          .map(
                            (id) => leadOptions.find((user) => user.id === id)?.name ?? "Pessoa",
                          )
                          .join(", ");
                      },
                    }}
                    value={form.leadIds}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        leadIds: event.target.value as unknown as string[],
                      }))
                    }
                    helperText="Use este campo para marcar outras pessoas como referência da equipe."
                  >
                    {leadOptions.map((user) => (
                      <MenuItem key={user.id} value={user.id}>
                        <Checkbox checked={form.leadIds.includes(user.id)} />
                        <ListItemText primary={user.name} />
                      </MenuItem>
                    ))}
                  </TextField>
                </Stack>
              </Collapse>
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: { xs: 2.5, md: 3 }, py: { xs: 2, md: 2.5 } }}>
          <Button onClick={handleClose} variant="outlined">
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={isPending || !form.name.trim() || !form.summary.trim()}
          >
            Criar equipe
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
