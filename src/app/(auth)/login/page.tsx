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
          maxWidth: showDevelopmentAccessPanel ? 1120 : 760,
          display: "grid",
          gap: 3,
          gridTemplateColumns: {
            xs: "1fr",
            lg: showDevelopmentAccessPanel ? "1.05fr 0.95fr" : "minmax(0, 1fr)",
          },
        }}
      >
        <Paper sx={{ p: { xs: 3, md: 5 } }}>
          <Stack spacing={3}>
            <Box>
              <Typography
                variant="overline"
                sx={{ color: "primary.light", letterSpacing: "0.18em" }}
              >
                WORKSPACE DO TCC
              </Typography>
              <Typography variant="h1" sx={{ mt: 1 }}>
                Organize o desenvolvimento do TCC em um só lugar
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 2, maxWidth: 560 }}>
                Acompanhe projetos, tarefas, sprints e prazos do grupo em um
                workspace compartilhado para manter o trabalho alinhado.
              </Typography>
            </Box>

            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              <Chip label="Projetos do grupo" />
              <Chip label="Tarefas e sprints" />
              <Chip label="Prazos e acompanhamento" />
            </Stack>

            <Paper variant="outlined" sx={{ p: 2.5 }}>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="h3">Entrar no workspace</Typography>
                  <Typography color="text.secondary" sx={{ mt: 0.75 }}>
                    {showDevelopmentAccessPanel
                      ? "Use um dos acessos disponíveis para acompanhar o trabalho do TCC."
                      : "Use seu e-mail do grupo e a senha cadastrada pela administração para acessar o workspace."}
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
                    <Button type="submit" size="large" variant="contained">
                      Entrar
                    </Button>
                  </Stack>
                </form>
              </Stack>
            </Paper>
          </Stack>
        </Paper>

        {showDevelopmentAccessPanel ? (
          <Paper sx={{ p: { xs: 3, md: 4 } }}>
            <Stack spacing={2.5}>
              <Box>
                <Typography variant="h3">Acessos do grupo</Typography>
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
      </Box>
    </Box>
  );
}
