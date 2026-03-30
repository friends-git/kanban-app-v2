"use client";

import {
  AutoAwesomeRounded,
  ChevronLeftRounded,
  ChevronRightRounded,
  LogoutRounded,
  PersonRounded,
} from "@mui/icons-material";
import {
  Avatar,
  Box,
  Button,
  Divider,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
  alpha,
} from "@mui/material";
import Link from "next/link";
import { roleLabels } from "@/lib/domain";
import { logoutAction } from "@/server/auth/actions";
import { SidebarNav } from "@/components/layout/sidebar-nav";

type SidebarProps = {
  showAdmin: boolean;
  collapsed: boolean;
  onToggle: () => void;
  user: {
    name: string;
    role: keyof typeof roleLabels;
    title: string | null;
    avatarColor: string | null;
  };
};

export function Sidebar({ showAdmin, collapsed, onToggle, user }: SidebarProps) {
  return (
    <Paper
      component="aside"
      square
      sx={{
        display: { xs: "none", lg: "block" },
        minHeight: "100vh",
        px: collapsed ? 1.25 : 2.5,
        py: 2.5,
        borderRight: "1px solid",
        borderColor: "divider",
        transition: "padding 220ms cubic-bezier(0.2, 0.8, 0.2, 1)",
      }}
    >
      <Stack justifyContent="space-between" sx={{ height: "100%" }}>
        <Stack spacing={collapsed ? 2 : 3}>
          <Box
            sx={{
              display: "flex",
              justifyContent: collapsed ? "center" : "flex-end",
            }}
          >
            <Tooltip title={collapsed ? "Expandir sidebar" : "Recolher sidebar"} placement="right">
              <IconButton
                onClick={onToggle}
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  bgcolor: "background.paper",
                  boxShadow: "0 12px 24px rgba(7, 6, 12, 0.08)",
                }}
              >
                {collapsed ? <ChevronRightRounded /> : <ChevronLeftRounded />}
              </IconButton>
            </Tooltip>
          </Box>

          {collapsed ? (
            <Stack spacing={2} alignItems="center">
              <Tooltip title="Rolezito TCC" placement="right">
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 3.25,
                    bgcolor: "primary.main",
                    color: "primary.contrastText",
                    display: "grid",
                    placeItems: "center",
                    boxShadow: "0 12px 24px rgba(255, 187, 0, 0.18)",
                  }}
                >
                  <AutoAwesomeRounded fontSize="small" />
                </Box>
              </Tooltip>

              <SidebarNav showAdmin={showAdmin} collapsed />
            </Stack>
          ) : (
            <>
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
                        Organizacao do grupo
                      </Typography>
                    </Box>
                  </Stack>
                  <Typography color="text.secondary" variant="body2">
                    Projetos, tarefas, sprints e prazos do TCC reunidos em um so espaco de
                    trabalho.
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
            </>
          )}
        </Stack>

        <Stack spacing={2}>
          <Divider />

          {collapsed ? (
            <Stack spacing={1.1} alignItems="center">
              <Tooltip title={`${user.name} • ${roleLabels[user.role]}`} placement="right">
                <Avatar
                  component={Link}
                  href="/profile"
                  sx={{
                    bgcolor: user.avatarColor ?? "secondary.main",
                    textDecoration: "none",
                    cursor: "pointer",
                    width: 42,
                    height: 42,
                    boxShadow: "0 10px 18px rgba(7, 6, 12, 0.14)",
                  }}
                >
                  {user.name.charAt(0)}
                </Avatar>
              </Tooltip>
              <Tooltip title="Meu perfil" placement="right">
                <IconButton
                  component={Link}
                  href="/profile"
                  sx={{
                    border: "1px solid",
                    borderColor: "divider",
                    color: "text.secondary",
                  }}
                >
                  <PersonRounded fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Sair" placement="right">
                <Box component="form" action={logoutAction}>
                  <IconButton
                    type="submit"
                    sx={{
                      border: "1px solid",
                      borderColor: alpha("#ff6b6b", 0.22),
                      color: "error.main",
                    }}
                  >
                    <LogoutRounded fontSize="small" />
                  </IconButton>
                </Box>
              </Tooltip>
            </Stack>
          ) : (
            <>
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
              <Button component={Link} href="/profile" fullWidth variant="text">
                Meu perfil
              </Button>
              <form action={logoutAction}>
                <Button fullWidth type="submit" variant="outlined">
                  Sair
                </Button>
              </form>
            </>
          )}
        </Stack>
      </Stack>
    </Paper>
  );
}
