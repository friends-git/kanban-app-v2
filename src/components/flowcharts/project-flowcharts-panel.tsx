"use client";

import { useState, useTransition } from "react";
import {
  AddRounded,
  ContentCopyRounded,
  DeleteOutlineRounded,
  OpenInFullRounded,
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
} from "@mui/material";
import { useRouter } from "next/navigation";
import {
  archiveFlowchartAction,
  createProjectFlowchartAction,
  duplicateFlowchartAction,
} from "@/server/actions/flowcharts";
import { EmptyState } from "@/components/ui/empty-state";
import { formatFullDate } from "@/lib/formatters";

type ProjectFlowchartsPanelProps = {
  projectId: string;
  canManage: boolean;
  flowcharts: Array<{
    id: string;
    name: string;
    description: string | null;
    updatedAt: string;
    createdBy: {
      id: string;
      name: string;
      avatarColor?: string | null;
    } | null;
  }>;
};

export function ProjectFlowchartsPanel({
  projectId,
  canManage,
  flowcharts,
}: ProjectFlowchartsPanelProps) {
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
      router.push(`/flowcharts/${result.flowchartId}`);
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

      router.refresh();
    });
  };

  return (
    <Stack spacing={2}>
      {message ? <Alert severity="error">{message}</Alert> : null}

      {canManage ? (
        <Stack direction="row" justifyContent="flex-end">
          <Button
            onClick={() => setDialogOpen(true)}
            variant="contained"
            startIcon={<AddRounded />}
          >
            Novo diagrama
          </Button>
        </Stack>
      ) : null}

      {flowcharts.length ? (
        <Stack spacing={1.25}>
          {flowcharts.map((flowchart) => (
            <Box
              key={flowchart.id}
              sx={{
                p: 2,
                borderRadius: 5,
                border: "1px solid",
                borderColor: "divider",
                bgcolor: "action.hover",
              }}
            >
              <Stack
                direction={{ xs: "column", lg: "row" }}
                justifyContent="space-between"
                spacing={2}
              >
                <Stack spacing={0.75} sx={{ minWidth: 0 }}>
                  <Typography fontWeight={800}>{flowchart.name}</Typography>
                  <Typography color="text.secondary" variant="body2">
                    {flowchart.description ?? "Sem descrição complementar."}
                  </Typography>
                  <Typography color="text.secondary" variant="caption">
                    Atualizado em {formatFullDate(flowchart.updatedAt)} · criado por{" "}
                    {flowchart.createdBy?.name ?? "workspace"}
                  </Typography>
                </Stack>

                <Stack direction="row" spacing={1} alignItems="flex-start">
                  <Button
                    onClick={() => router.push(`/flowcharts/${flowchart.id}`)}
                    variant="outlined"
                    startIcon={<OpenInFullRounded />}
                  >
                    Abrir
                  </Button>
                  {canManage ? (
                    <>
                      <IconButton
                        onClick={() => handleDuplicate(flowchart.id)}
                        disabled={isPending}
                      >
                        <ContentCopyRounded />
                      </IconButton>
                      <IconButton
                        onClick={() => handleArchive(flowchart.id)}
                        disabled={isPending}
                      >
                        <DeleteOutlineRounded />
                      </IconButton>
                    </>
                  ) : null}
                </Stack>
              </Stack>
            </Box>
          ))}
        </Stack>
      ) : (
        <EmptyState
          title="Nenhum diagrama manual neste projeto"
          message="Crie um diagrama para registrar decisões, fluxos operacionais e recortes específicos desta frente."
          action={
            canManage ? (
              <Button
                onClick={() => setDialogOpen(true)}
                variant="contained"
                startIcon={<AddRounded />}
              >
                Criar primeiro diagrama
              </Button>
            ) : null
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
              placeholder="Ex.: Fluxo de revisão do capítulo"
            />
            <TextField
              label="Descrição"
              multiline
              minRows={3}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Contexto rápido para quem abrir o diagrama depois."
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setDialogOpen(false)} variant="outlined">
            Cancelar
          </Button>
          <Button onClick={handleCreate} variant="contained" disabled={isPending}>
            {isPending ? "Criando..." : "Criar e abrir"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
