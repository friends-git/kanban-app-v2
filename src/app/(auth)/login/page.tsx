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
          maxWidth: 1120,
          display: "grid",
          gap: 3,
          gridTemplateColumns: { xs: "1fr", lg: "1.05fr 0.95fr" },
        }}
      >
        <Paper sx={{ p: { xs: 3, md: 5 } }}>
          <Stack spacing={3}>
            <Box>
              <Typography
                variant="overline"
                sx={{ color: "primary.light", letterSpacing: "0.18em" }}
              >
                PLATAFORMA TCC
              </Typography>
              <Typography variant="h1" sx={{ mt: 1 }}>
                Gestão única do grupo, sem multi-tenant
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 2, maxWidth: 560 }}>
                Base inicial do produto com autenticação simples, Prisma,
                páginas operacionais e seed demonstrável para a apresentação.
              </Typography>
            </Box>

            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              <Chip label="Next.js full-stack" />
              <Chip label="Prisma + PostgreSQL" />
              <Chip label="UI inspirada no Notion" />
            </Stack>

            <Paper variant="outlined" sx={{ p: 2.5 }}>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="h3">Entrar</Typography>
                  <Typography color="text.secondary" sx={{ mt: 0.75 }}>
                    Use qualquer conta do seed para navegar pelas páginas base.
                  </Typography>
                </Box>

                {error ? <Alert severity="error">{error}</Alert> : null}

                <form action={loginAction}>
                  <Stack spacing={2}>
                    <TextField
                      name="email"
                      type="email"
                      label="E-mail"
                      placeholder="leonardo@tcc.local"
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
                      Acessar workspace
                    </Button>
                  </Stack>
                </form>
              </Stack>
            </Paper>
          </Stack>
        </Paper>

        <Paper sx={{ p: { xs: 3, md: 4 } }}>
          <Stack spacing={2.5}>
            <Box>
              <Typography variant="h3">Contas de demonstração</Typography>
              <Typography color="text.secondary" sx={{ mt: 0.75 }}>
                Senha padrão para todos os usuários: <strong>{SEED_DEFAULT_PASSWORD}</strong>
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
      </Box>
    </Box>
  );
}
