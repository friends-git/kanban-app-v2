import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import Link from "next/link";
import { roleLabels } from "@/lib/domain";
import { canAccessAdmin } from "@/server/permissions";
import { ForcePasswordChangeDialog } from "@/components/profile/force-password-change-dialog";
import { Sidebar } from "@/components/layout/sidebar";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { TopBar } from "@/components/layout/top-bar";

type AppLayoutProps = {
  user: {
    id: string;
    name: string;
    email: string;
    role: Parameters<typeof canAccessAdmin>[0]["role"];
    title: string | null;
    avatarColor: string | null;
  };
  requiresPasswordChange: boolean;
  children: React.ReactNode;
};

export function AppLayout({
  user,
  requiresPasswordChange,
  children,
}: AppLayoutProps) {
  const showAdmin = canAccessAdmin(user);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: { xs: "1fr", lg: "300px minmax(0, 1fr)" },
      }}
    >
      <ForcePasswordChangeDialog open={requiresPasswordChange} />
      <Sidebar showAdmin={showAdmin} user={user} />

      <Box sx={{ minWidth: 0, px: { xs: 2, md: 3 }, py: { xs: 2, md: 3 } }}>
        <TopBar user={user} />

        <Paper
          sx={{
            display: { xs: "block", lg: "none" },
            p: 2,
            mb: 3,
          }}
        >
          <Stack spacing={2}>
            <Box>
              <Typography variant="h4">Rolezito TCC</Typography>
              <Typography color="text.secondary" variant="body2">
                {user.name} • {roleLabels[user.role]}
              </Typography>
            </Box>
            <SidebarNav showAdmin={showAdmin} mobile />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
              <Button component={Link} href="/profile" variant="outlined" fullWidth>
                Meu perfil
              </Button>
              <Button
                component={Link}
                href="/projects?composer=new-project"
                variant="contained"
                fullWidth
              >
                Novo projeto
              </Button>
            </Stack>
          </Stack>
        </Paper>

        <Box sx={{ pb: 4 }}>{children}</Box>
      </Box>
    </Box>
  );
}

export const AppShell = AppLayout;
