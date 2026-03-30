"use client";

import { useMemo, useState, useTransition } from "react";
import {
  AccountTreeRounded,
  AddRounded,
  ContentCopyRounded,
  DeleteOutlineRounded,
  LaunchRounded,
} from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { FlowchartScopeType } from "@prisma/client";
import { flowchartScopeLabels } from "@/lib/domain";
import { formatFullDate } from "@/lib/formatters";
import {
  archiveFlowchartAction,
  createWorkspaceFlowchartAction,
  duplicateFlowchartAction,
} from "@/server/actions/flowcharts";
import { FlowEmptyState } from "@/components/flowcharts/flow-empty-state";
import { PageHeader } from "@/components/ui/page-header";

type FlowchartDirectoryItem = {
  id: string;
  name: string;
  description: string | null;
  scopeType: FlowchartScopeType;
  updatedAt: string;
  createdAt: string;
  canManage: boolean;
  createdBy: {
    id: string;
    name: string;
    avatarColor: string | null;
  } | null;
  project: {
    id: string;
    name: string;
  } | null;
  task: {
    id: string;
    code: string;
    title: string;
  } | null;
};

type FlowchartsDirectoryPageProps = {
  canCreateWorkspaceFlowchart: boolean;
  sections: {
    workspace: FlowchartDirectoryItem[];
    projects: FlowchartDirectoryItem[];
    tasks: FlowchartDirectoryItem[];
  };
};

export function FlowchartsDirectoryPage({
  canCreateWorkspaceFlowchart,
  sections,
}: FlowchartsDirectoryPageProps) {
  const theme = useTheme();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(
    null,
  );
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const allFlowcharts = useMemo(
    () => [...sections.workspace, ...sections.tasks, ...sections.projects],
    [sections.projects, sections.tasks, sections.workspace],
  );

  const handleCreate = () => {
    setMessage(null);

    startTransition(async () => {
      const result = await createWorkspaceFlowchartAction({
        name,
        description,
      });

      if (!result.ok) {
        setMessage({ type: "error", text: result.error });
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
        setMessage({ type: "error", text: result.error });
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
        setMessage({ type: "error", text: result.error });
        return;
      }

      router.refresh();
    });
  };

  return (
    <Stack spacing={3}>
      <PageHeader
        eyebrow="Diagramas"
        title="Diagramas do workspace"
        description="Concentre mapas visuais soltos, diagramas ligados a tarefas e fluxos de projeto em uma área própria, sem perder a possibilidade de relacionar cada canvas depois."
        chips={[
          `${allFlowcharts.length} diagramas`,
          `${sections.workspace.length} soltos`,
          `${sections.tasks.length} por tarefa`,
          `${sections.projects.length} por projeto`,
        ]}
        actions={
          canCreateWorkspaceFlowchart ? (
            <Button
              onClick={() => setDialogOpen(true)}
              variant="contained"
              startIcon={<AddRounded />}
            >
              Novo diagrama
            </Button>
          ) : undefined
        }
      />

      {message ? <Alert severity={message.type}>{message.text}</Alert> : null}

      <Stack
        direction={{ xs: "column", lg: "row" }}
        spacing={1.5}
        useFlexGap
        flexWrap="wrap"
      >
        <SummaryCard
          title="Todos"
          value={allFlowcharts.length}
          subtitle="Diagramas manuais visíveis no workspace"
        />
        <SummaryCard
          title="Soltos"
          value={sections.workspace.length}
          subtitle="Ainda não vinculados a projeto ou tarefa"
        />
        <SummaryCard
          title="Por tarefa"
          value={sections.tasks.length}
          subtitle="Relacionados ao trabalho operacional"
        />
        <SummaryCard
          title="Por projeto"
          value={sections.projects.length}
          subtitle="Relacionados ao contexto maior do projeto"
        />
      </Stack>

      <FlowchartSection
        title="Diagramas soltos"
        description="Whiteboards livres para brainstorming, documentação e estruturas que ainda não pertencem a um projeto ou tarefa."
        items={sections.workspace}
        canManageWorkspace={canCreateWorkspaceFlowchart}
        emptyAction={
          canCreateWorkspaceFlowchart
            ? {
                label: "Novo diagrama",
                onClick: () => setDialogOpen(true),
              }
            : undefined
        }
        onOpen={(flowchartId) => router.push(`/flowcharts/${flowchartId}`)}
        onDuplicate={handleDuplicate}
        onArchive={handleArchive}
        pending={isPending}
      />

      <FlowchartSection
        title="Diagramas por tarefa"
        description="Fluxos manuais anexados a tarefas específicas, úteis para detalhar implementação, revisão e documentação do TCC."
        items={sections.tasks}
        onOpen={(flowchartId) => router.push(`/flowcharts/${flowchartId}`)}
        onDuplicate={handleDuplicate}
        onArchive={handleArchive}
        pending={isPending}
      />

      <FlowchartSection
        title="Diagramas por projeto"
        description="Mapas visuais maiores do projeto, com foco em arquitetura, decisões, planejamento e documentação transversal."
        items={sections.projects}
        onOpen={(flowchartId) => router.push(`/flowcharts/${flowchartId}`)}
        onDuplicate={handleDuplicate}
        onArchive={handleArchive}
        pending={isPending}
      />

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Novo diagrama solto</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              autoFocus
              label="Nome"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex.: Fluxo geral da banca"
            />
            <TextField
              label="Descrição"
              multiline
              minRows={3}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Contexto inicial do canvas. Você pode vinculá-lo depois a um projeto ou tarefa."
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setDialogOpen(false)} variant="text">
            Cancelar
          </Button>
          <Button
            onClick={handleCreate}
            disabled={isPending || name.trim().length < 3}
            variant="contained"
          >
            {isPending ? "Criando..." : "Criar diagrama"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

function SummaryCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: number;
  subtitle: string;
}) {
  return (
    <Paper
      sx={{
        flex: "1 1 220px",
        minWidth: 0,
        p: 2,
      }}
    >
      <Stack spacing={0.6}>
        <Typography
          variant="overline"
          sx={{ color: "secondary.main", letterSpacing: "0.14em" }}
        >
          {title}
        </Typography>
        <Typography variant="h2">{value}</Typography>
        <Typography color="text.secondary" variant="body2">
          {subtitle}
        </Typography>
      </Stack>
    </Paper>
  );
}

function FlowchartSection({
  title,
  description,
  items,
  canManageWorkspace = false,
  emptyAction,
  onOpen,
  onDuplicate,
  onArchive,
  pending,
}: {
  title: string;
  description: string;
  items: FlowchartDirectoryItem[];
  canManageWorkspace?: boolean;
  emptyAction?: {
    label: string;
    onClick: () => void;
  };
  onOpen: (flowchartId: string) => void;
  onDuplicate: (flowchartId: string) => void;
  onArchive: (flowchartId: string) => void;
  pending: boolean;
}) {
  const theme = useTheme();

  return (
    <Paper sx={{ p: 2.25 }}>
      <Stack spacing={2}>
        <Stack spacing={0.65}>
          <Typography variant="h3">{title}</Typography>
          <Typography color="text.secondary">{description}</Typography>
          {canManageWorkspace && title === "Diagramas soltos" ? (
            <Typography color="text.secondary" variant="caption">
              Diagramas dessa seção podem ser relacionados depois a projeto ou tarefa.
            </Typography>
          ) : null}
        </Stack>

        {items.length ? (
          <Stack spacing={1.15}>
            {items.map((item) => (
              <Box
                key={item.id}
                sx={{
                  p: 1.6,
                  borderRadius: 4.5,
                  border: "1px solid",
                  borderColor: "divider",
                  bgcolor: alpha(theme.palette.background.paper, 0.72),
                }}
              >
                <Stack spacing={1}>
                  <Stack direction="row" justifyContent="space-between" spacing={1.5}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography fontWeight={800}>{item.name}</Typography>
                      <Typography color="text.secondary" variant="body2">
                        {item.description ?? "Sem descrição complementar."}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={0.25}>
                      <IconButton
                        size="small"
                        onClick={() => onOpen(item.id)}
                        title="Abrir diagrama"
                      >
                        <LaunchRounded fontSize="small" />
                      </IconButton>
                      {item.canManage ? (
                        <>
                          <IconButton
                            size="small"
                            onClick={() => onDuplicate(item.id)}
                            disabled={pending}
                            title="Duplicar"
                          >
                            <ContentCopyRounded fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => onArchive(item.id)}
                            disabled={pending}
                            title="Excluir"
                          >
                            <DeleteOutlineRounded fontSize="small" />
                          </IconButton>
                        </>
                      ) : null}
                    </Stack>
                  </Stack>

                  <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center">
                    <MetaPill text={flowchartScopeLabels[item.scopeType]} />
                    {item.project ? <MetaPill text={item.project.name} /> : null}
                    {item.task ? <MetaPill text={item.task.code} /> : null}
                  </Stack>

                  {item.task ? (
                    <Typography color="text.secondary" variant="caption">
                      Tarefa: {item.task.code} · {item.task.title}
                    </Typography>
                  ) : null}

                  <Divider />

                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    justifyContent="space-between"
                    spacing={0.75}
                  >
                    <Typography color="text.secondary" variant="caption">
                      Atualizado em {formatFullDate(item.updatedAt)}
                    </Typography>
                    <Typography color="text.secondary" variant="caption">
                      Criado por {item.createdBy?.name ?? "workspace"}
                    </Typography>
                  </Stack>
                </Stack>
              </Box>
            ))}
          </Stack>
        ) : (
          <FlowEmptyState
            title={`Sem itens em ${title.toLowerCase()}`}
            message="Nada visível nesta seção ainda."
            action={emptyAction}
          />
        )}
      </Stack>
    </Paper>
  );
}

function MetaPill({ text }: { text: string }) {
  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.65,
        px: 1,
        py: 0.45,
        borderRadius: 999,
        border: "1px solid",
        borderColor: "divider",
      }}
    >
      <AccountTreeRounded sx={{ fontSize: 14, color: "secondary.main" }} />
      <Typography variant="caption" sx={{ fontWeight: 700 }}>
        {text}
      </Typography>
    </Box>
  );
}
