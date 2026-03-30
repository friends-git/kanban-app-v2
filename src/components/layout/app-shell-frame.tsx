"use client";

import { useEffect, useState } from "react";
import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import Link from "next/link";
import { roleLabels } from "@/lib/domain";
import { ForcePasswordChangeDialog } from "@/components/profile/force-password-change-dialog";
import { Sidebar } from "@/components/layout/sidebar";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { TopBar } from "@/components/layout/top-bar";

type AppShellFrameProps = {
  user: {
    id: string;
    name: string;
    email: string;
    role: keyof typeof roleLabels;
    title: string | null;
    avatarColor: string | null;
  };
  requiresPasswordChange: boolean;
  showAdmin: boolean;
  children: React.ReactNode;
};

const SIDEBAR_STORAGE_KEY = "rolezito-workspace-sidebar-collapsed";

export function AppShellFrame({
  user,
  requiresPasswordChange,
  showAdmin,
  children,
}: AppShellFrameProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const storedValue = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
    setCollapsed(storedValue === "true");
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(collapsed));
  }, [collapsed, hydrated]);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: {
          xs: "1fr",
          lg: collapsed ? "96px minmax(0, 1fr)" : "300px minmax(0, 1fr)",
        },
        transition: "grid-template-columns 220ms cubic-bezier(0.2, 0.8, 0.2, 1)",
      }}
    >
      <ForcePasswordChangeDialog open={requiresPasswordChange} />
      <Sidebar
        showAdmin={showAdmin}
        user={user}
        collapsed={collapsed}
        onToggle={() => setCollapsed((current) => !current)}
      />

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
