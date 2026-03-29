import { AutoAwesomeRounded } from "@mui/icons-material";
import { Avatar, Box, Button, Divider, Paper, Stack, Typography } from "@mui/material";
import Link from "next/link";
import { roleLabels } from "@/lib/domain";
import { logoutAction } from "@/server/auth/actions";
import { SidebarNav } from "@/components/layout/sidebar-nav";

type SidebarProps = {
  showAdmin: boolean;
  user: {
    name: string;
    role: keyof typeof roleLabels;
    title: string | null;
    avatarColor: string | null;
  };
};

export function Sidebar({ showAdmin, user }: SidebarProps) {
  return (
    <Paper
      component="aside"
      square
      sx={{
        display: { xs: "none", lg: "block" },
        minHeight: "100vh",
        px: 2.5,
        py: 3,
        borderRight: "1px solid",
        borderColor: "divider",
      }}
    >
      <Stack justifyContent="space-between" sx={{ height: "100%" }}>
        <Stack spacing={3}>
          <Paper
            sx={{
              p: 2.25,
              bgcolor: "background.paper",
            }}
          >
            <Stack spacing={1.5}>
              <Stack direction="row" spacing={1.25} alignItems="center">
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 3,
                    bgcolor: "primary.main",
                    color: "primary.contrastText",
                    display: "grid",
                    placeItems: "center",
                    boxShadow: "0 12px 24px rgba(255, 187, 0, 0.18)",
                  }}
                >
                  <AutoAwesomeRounded fontSize="small" />
                </Box>
                <Box>
                  <Typography variant="h4">Rolezito TCC</Typography>
                  <Typography color="text.secondary" variant="body2">
                    Organização do grupo
                  </Typography>
                </Box>
              </Stack>
              <Typography color="text.secondary" variant="body2">
                Projetos, tarefas, sprints e prazos do TCC reunidos em um só
                espaço de trabalho.
              </Typography>
              <Button
                component={Link}
                href="/projects?composer=new-project"
                variant="contained"
                color="primary"
              >
                Novo projeto
              </Button>
            </Stack>
          </Paper>

          <SidebarNav showAdmin={showAdmin} />
        </Stack>

        <Stack spacing={2}>
          <Divider />
          <Stack direction="row" spacing={1.25} alignItems="center">
            <Avatar sx={{ bgcolor: user.avatarColor ?? "secondary.main" }}>
              {user.name.charAt(0)}
            </Avatar>
            <Box>
              <Typography fontWeight={700}>{user.name}</Typography>
              <Typography color="text.secondary" variant="body2">
                {roleLabels[user.role]} • {user.title ?? "Grupo do TCC"}
              </Typography>
            </Box>
          </Stack>
          <form action={logoutAction}>
            <Button fullWidth type="submit" variant="outlined">
              Sair
            </Button>
          </form>
        </Stack>
      </Stack>
    </Paper>
  );
}
