"use client";

import { useState, useTransition } from "react";
import {
  AddRounded,
  ContentCopyRounded,
  DeleteOutlineRounded,
} from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import { useRouter } from "next/navigation";
import {
  archiveFlowchartAction,
  createProjectFlowchartAction,
  duplicateFlowchartAction,
} from "@/server/actions/flowcharts";
import { formatFullDate } from "@/lib/formatters";
import { FlowEmptyState } from "@/components/flowcharts/flow-empty-state";

type FlowDiagramListProps = {
  projectId: string;
  canManage: boolean;
  selectedId?: string | null;
  createRedirectBaseHref: string;
  items: Array<{
    id: string;
    name: string;
    description: string | null;
    updatedAt: string;
    createdBy: {
      name: string;
    } | null;
    href: string;
  }>;
};

export function FlowDiagramList({
  projectId,
  canManage,
  selectedId,
  createRedirectBaseHref,
  items,
}: FlowDiagramListProps) {
  const theme = useTheme();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const handleCreate = () => {
    setMessage(null);

    startTransition(async () => {
      const result = await createProjectFlowchartAction({
        projectId,
        name,
        description,
      });

      if (!result.ok) {
        setMessage(result.error);
        return;
      }

      setDialogOpen(false);
      setName("");
      setDescription("");
      router.push(`${createRedirectBaseHref}&diagramId=${result.flowchartId}`);
    });
  };

  const handleDuplicate = (flowchartId: string) => {
    setMessage(null);

    startTransition(async () => {
      const result = await duplicateFlowchartAction({
        flowchartId,
      });

      if (!result.ok) {
        setMessage(result.error);
        return;
      }

      router.push(`${createRedirectBaseHref}&diagramId=${result.flowchartId}`);
      router.refresh();
    });
  };

  const handleArchive = (flowchartId: string) => {
    setMessage(null);

    startTransition(async () => {
      const result = await archiveFlowchartAction({
        flowchartId,
      });

      if (!result.ok) {
        setMessage(result.error);
        return;
      }

      router.push(createRedirectBaseHref);
      router.refresh();
    });
  };

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" justifyContent="space-between" spacing={1} alignItems="center">
        <Box>
          <Typography
            variant="overline"
            sx={{ color: "secondary.main", letterSpacing: "0.14em" }}
          >
            Diagramas
          </Typography>
          <Typography variant="h3" sx={{ mt: 0.35 }}>
            Canvas do projeto
          </Typography>
        </Box>
        {canManage ? (
          <Button
            onClick={() => setDialogOpen(true)}
            variant="contained"
            size="small"
            startIcon={<AddRounded />}
          >
            Novo
          </Button>
        ) : null}
      </Stack>

      {message ? <Alert severity="error">{message}</Alert> : null}

      {items.length ? (
        <Stack spacing={1}>
          {items.map((item) => {
            const selected = item.id === selectedId;

            return (
              <Box
                key={item.id}
                role="button"
                tabIndex={0}
                onClick={() => router.push(item.href)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    router.push(item.href);
                  }
                }}
                sx={{
                  display: "block",
                  p: 1.5,
                  borderRadius: 4.5,
                  border: "1px solid",
                  borderColor: selected ? "secondary.main" : "divider",
                  bgcolor: selected
                    ? alpha(theme.palette.secondary.main, 0.08)
                    : "background.paper",
                  transition: "180ms ease",
                  "&:hover": {
                    borderColor: selected ? "secondary.main" : alpha(theme.palette.text.primary, 0.18),
                    bgcolor: selected
                      ? alpha(theme.palette.secondary.main, 0.12)
                      : alpha(theme.palette.background.default, 0.5),
                  },
                  cursor: "pointer",
                }}
              >
                <Stack spacing={0.75}>
                  <Stack direction="row" justifyContent="space-between" spacing={1}>
                    <Typography fontWeight={800} sx={{ minWidth: 0 }}>
                      {item.name}
                    </Typography>
                    {canManage ? (
                      <Stack direction="row" spacing={0.25}>
                        <IconButton
                          size="small"
                          onClick={(event) => {
                            event.preventDefault();
                            handleDuplicate(item.id);
                          }}
                          disabled={isPending}
                        >
                          <ContentCopyRounded fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={(event) => {
                            event.preventDefault();
                            handleArchive(item.id);
                          }}
                          disabled={isPending}
                        >
                          <DeleteOutlineRounded fontSize="small" />
                        </IconButton>
                      </Stack>
                    ) : null}
                  </Stack>
                  <Typography color="text.secondary" variant="body2">
                    {item.description ?? "Sem descrição complementar."}
                  </Typography>
                  <Typography color="text.secondary" variant="caption">
                    Atualizado em {formatFullDate(item.updatedAt)} · {item.createdBy?.name ?? "workspace"}
                  </Typography>
                </Stack>
              </Box>
            );
          })}
        </Stack>
      ) : (
        <FlowEmptyState
          title="Sem diagramas"
          message="Crie o primeiro whiteboard deste projeto para mapear decisões, fluxos e ideias visuais."
          action={
            canManage
              ? {
                  label: "Novo diagrama",
                  onClick: () => setDialogOpen(true),
                }
              : undefined
          }
        />
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Novo diagrama</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              autoFocus
              label="Nome"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex.: Mapa da sprint"
            />
            <TextField
              label="Descrição"
              multiline
              minRows={3}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Contexto rápido do quadro visual."
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setDialogOpen(false)} variant="outlined">
            Cancelar
          </Button>
          <Button onClick={handleCreate} variant="contained" disabled={isPending}>
            {isPending ? "Criando..." : "Criar diagrama"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
