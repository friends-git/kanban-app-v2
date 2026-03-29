import EventNoteRoundedIcon from "@mui/icons-material/EventNoteRounded";
import TaskAltRoundedIcon from "@mui/icons-material/TaskAltRounded";
import ViewKanbanRoundedIcon from "@mui/icons-material/ViewKanbanRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { redirect } from "next/navigation";
import { demoUsers, SEED_DEFAULT_PASSWORD } from "@/lib/demo-users";
import { roleLabels } from "@/lib/domain";
import { loginAction } from "@/server/auth/actions";
import { getCurrentUser } from "@/server/auth/session";

type LoginPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

const errorMessages: Record<string, string> = {
  formato: "Preencha um e-mail válido e uma senha com pelo menos 6 caracteres.",
  credenciais: "E-mail ou senha inválidos.",
};

const heroSignals = [
  {
    label: "Projetos e frentes",
    description: "Organize o escopo do Rolezito sem perder o contexto do grupo.",
  },
  {
    label: "Tarefas e checklist",
    description: "Acompanhe execução, responsáveis e pendências em um único fluxo.",
  },
  {
    label: "Prazos e entregas",
    description: "Deixe visível o que precisa avançar antes da próxima entrega.",
  },
];

const workspaceHighlights = [
  {
    title: "Quadros de execução",
    description: "Veja o que está em backlog, em andamento, em revisão e concluído.",
    icon: ViewKanbanRoundedIcon,
  },
  {
    title: "Checklist e detalhe",
    description: "Abra a tarefa e acompanhe descrição, comentários e progresso da entrega.",
    icon: TaskAltRoundedIcon,
  },
  {
    title: "Prazos e acompanhamento",
    description: "Centralize sprints, calendário e leitura do andamento para o grupo e a orientadora.",
    icon: EventNoteRoundedIcon,
  },
];

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const user = await getCurrentUser();
  const showDevelopmentAccessPanel = process.env.NODE_ENV !== "production";

  if (user) {
    redirect("/dashboard");
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const error =
    resolvedSearchParams?.error && errorMessages[resolvedSearchParams.error]
      ? errorMessages[resolvedSearchParams.error]
      : null;

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        px: 2,
        py: 4,
      }}
    >
      <Box
        sx={{
          width: "100%",
          maxWidth: 1180,
          display: "grid",
          gap: 3,
          gridTemplateColumns: {
            xs: "1fr",
            lg: "1.08fr 0.92fr",
          },
        }}
      >
        <Paper
          sx={{
            p: { xs: 3, md: 5 },
            position: "relative",
            overflow: "hidden",
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0)), var(--mui-palette-background-paper)",
            "&::before": {
              content: '""',
              position: "absolute",
              inset: "auto auto 20% -10%",
              width: 320,
              height: 320,
              borderRadius: "50%",
              background: "rgba(93, 5, 255, 0.14)",
              filter: "blur(80px)",
              pointerEvents: "none",
            },
            "&::after": {
              content: '""',
              position: "absolute",
              inset: "-10% -6% auto auto",
              width: 240,
              height: 240,
              borderRadius: "50%",
              background: "rgba(255, 187, 0, 0.12)",
              filter: "blur(60px)",
              pointerEvents: "none",
            },
          }}
        >
          <Stack spacing={4} sx={{ position: "relative", zIndex: 1 }}>
            <Box sx={{ maxWidth: 620 }}>
              <Typography
                variant="overline"
                sx={{ color: "primary.light", letterSpacing: "0.18em" }}
              >
                ROLEZITO WORKSPACE
              </Typography>
              <Typography variant="h1" sx={{ mt: 1 }}>
                Gestão do projeto Rolezito em um só lugar
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 2, maxWidth: 560 }}>
                Entre no workspace que centraliza projetos, tarefas, sprints,
                prazos e responsáveis do Rolezito para manter o grupo alinhado
                do planejamento à entrega.
              </Typography>
            </Box>

            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              <Chip label="Projeto Rolezito" />
              <Chip label="Execução do grupo" />
              <Chip label="Sprints e prazos" />
              <Chip label="Acompanhamento da orientadora" />
            </Stack>

            <Box
              sx={{
                display: "grid",
                gap: 2,
                gridTemplateColumns: {
                  xs: "1fr",
                  md: "repeat(3, minmax(0, 1fr))",
                },
              }}
            >
              {heroSignals.map((signal) => (
                <Paper
                  key={signal.label}
                  variant="outlined"
                  sx={{
                    p: 2.25,
                    bgcolor: "rgba(255,255,255,0.02)",
                    backdropFilter: "blur(18px)",
                  }}
                >
                  <Typography variant="h4">{signal.label}</Typography>
                  <Typography color="text.secondary" sx={{ mt: 1 }}>
                    {signal.description}
                  </Typography>
                </Paper>
              ))}
            </Box>

            <Paper
              variant="outlined"
              sx={{
                p: { xs: 2.5, md: 3 },
                maxWidth: 620,
                bgcolor: "rgba(255,255,255,0.03)",
                backdropFilter: "blur(18px)",
              }}
            >
              <Stack spacing={2}>
                <Box>
                  <Typography variant="h3">Entrar no workspace do Rolezito</Typography>
                  <Typography color="text.secondary" sx={{ mt: 0.75 }}>
                    {showDevelopmentAccessPanel
                      ? "Use um dos acessos disponíveis para acompanhar a gestão do projeto neste ambiente local."
                      : "Use seu e-mail do grupo e a senha cadastrada pela administração para acessar o projeto."}
                  </Typography>
                </Box>

                {error ? <Alert severity="error">{error}</Alert> : null}

                <form action={loginAction}>
                  <Stack spacing={2}>
                    <TextField
                      name="email"
                      type="email"
                      label="E-mail"
                      placeholder="seu.nome@rolezito.com"
                      required
                      fullWidth
                    />
                    <TextField
                      name="password"
                      type="password"
                      label="Senha"
                      required
                      fullWidth
                    />
                    <Typography color="text.secondary" variant="body2">
                      Se você estiver usando a senha padrão, a troca será pedida
                      logo após o primeiro acesso.
                    </Typography>
                    <Button type="submit" size="large" variant="contained">
                      Entrar
                    </Button>
                  </Stack>
                </form>
              </Stack>
            </Paper>
          </Stack>
        </Paper>

        <Stack spacing={3}>
          <Paper
            sx={{
              p: { xs: 3, md: 4 },
              background:
                "linear-gradient(180deg, rgba(93, 5, 255, 0.08), rgba(255, 255, 255, 0.01)), var(--mui-palette-background-paper)",
            }}
          >
            <Stack spacing={2.5}>
              <Box>
                <Typography
                  variant="overline"
                  sx={{ color: "secondary.main", letterSpacing: "0.16em" }}
                >
                  GESTÃO DO ROLEZITO
                </Typography>
                <Typography variant="h3" sx={{ mt: 1 }}>
                  O que você acompanha aqui
                </Typography>
                <Typography color="text.secondary" sx={{ mt: 0.75 }}>
                  O login dá acesso ao painel que organiza execução, entregas e
                  leitura do andamento do projeto em um único lugar.
                </Typography>
              </Box>
              <Stack spacing={1.5}>
                {workspaceHighlights.map((item) => {
                  const Icon = item.icon;

                  return (
                    <Paper
                      key={item.title}
                      variant="outlined"
                      sx={{ p: 2.25, bgcolor: "rgba(255,255,255,0.03)" }}
                    >
                      <Stack direction="row" spacing={1.5} alignItems="flex-start">
                        <Box
                          sx={{
                            width: 42,
                            height: 42,
                            borderRadius: 3,
                            display: "grid",
                            placeItems: "center",
                            color: "secondary.main",
                            bgcolor: "rgba(93, 5, 255, 0.10)",
                            flexShrink: 0,
                          }}
                        >
                          <Icon fontSize="small" />
                        </Box>
                        <Box>
                          <Typography fontWeight={700}>{item.title}</Typography>
                          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                            {item.description}
                          </Typography>
                        </Box>
                      </Stack>
                    </Paper>
                  );
                })}
              </Stack>
              <Paper
                variant="outlined"
                sx={{ p: 2.25, bgcolor: "rgba(255, 187, 0, 0.06)" }}
              >
                <Stack direction="row" spacing={1.5} alignItems="flex-start">
                  <Box
                    sx={{
                      width: 42,
                      height: 42,
                      borderRadius: 3,
                      display: "grid",
                      placeItems: "center",
                      color: "primary.main",
                      bgcolor: "rgba(255, 187, 0, 0.12)",
                      flexShrink: 0,
                    }}
                  >
                    <VisibilityRoundedIcon fontSize="small" />
                  </Box>
                  <Box>
                    <Typography fontWeight={700}>Visão compartilhada do andamento</Typography>
                    <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                      O grupo acompanha prioridades e a orientadora enxerga o
                      progresso sem depender de atualizações soltas.
                    </Typography>
                  </Box>
                </Stack>
              </Paper>
            </Stack>
          </Paper>

          {showDevelopmentAccessPanel ? (
            <Paper sx={{ p: { xs: 3, md: 4 } }}>
              <Stack spacing={2.5}>
                <Box>
                  <Typography variant="h3">Acessos locais de desenvolvimento</Typography>
                  <Typography color="text.secondary" sx={{ mt: 0.75 }}>
                    Senha disponível neste ambiente: <strong>{SEED_DEFAULT_PASSWORD}</strong>
                  </Typography>
                </Box>
                <Stack spacing={1.25}>
                  {demoUsers.map((account) => (
                    <Paper
                      key={account.email}
                      variant="outlined"
                      sx={{ p: 1.75, borderRadius: 3 }}
                    >
                      <Stack spacing={0.5}>
                        <Stack
                          direction="row"
                          justifyContent="space-between"
                          spacing={2}
                          alignItems="center"
                        >
                          <Typography fontWeight={700}>{account.name}</Typography>
                          <Chip label={roleLabels[account.role]} size="small" />
                        </Stack>
                        <Typography color="text.secondary" variant="body2">
                          {account.email}
                        </Typography>
                        <Typography color="text.secondary" variant="body2">
                          {account.title}
                        </Typography>
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              </Stack>
            </Paper>
          ) : null}
        </Stack>
      </Box>
    </Box>
  );
}
