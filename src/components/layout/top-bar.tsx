"use client";

import {
  DarkModeRounded,
  LightModeRounded,
  SearchRounded,
} from "@mui/icons-material";
import {
  Avatar,
  Box,
  Chip,
  IconButton,
  InputAdornment,
  OutlinedInput,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { roleLabels } from "@/lib/domain";
import { useAppColorMode } from "@/components/providers/app-providers";

type TopBarProps = {
  user: {
    name: string;
    role: keyof typeof roleLabels;
    avatarColor: string | null;
  };
};

export function TopBar({ user }: TopBarProps) {
  const { mode, toggleMode } = useAppColorMode();

  return (
    <Paper
      sx={{
        position: "sticky",
        top: 16,
        zIndex: 20,
        px: { xs: 2, md: 2.5 },
        py: 1.5,
        mb: 3,
        backdropFilter: "blur(22px)",
      }}
    >
      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        spacing={2}
        alignItems={{ xs: "stretch", md: "center" }}
      >
        <Box>
          <Typography
            variant="overline"
            sx={{ color: "secondary.main", letterSpacing: "0.16em" }}
          >
            ROLEZITO WORKSPACE
          </Typography>
          <Typography variant="h4" sx={{ mt: 0.25 }}>
            Plataforma do TCC
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5} alignItems="center">
          <OutlinedInput
            placeholder="Buscar projetos, tarefas ou sprints"
            sx={{ minWidth: { xs: 0, md: 320 }, flex: 1 }}
            startAdornment={
              <InputAdornment position="start">
                <SearchRounded fontSize="small" />
              </InputAdornment>
            }
          />
          <IconButton onClick={toggleMode}>
            {mode === "dark" ? <LightModeRounded /> : <DarkModeRounded />}
          </IconButton>
          <Chip label={roleLabels[user.role]} color="secondary" variant="outlined" />
          <Stack direction="row" spacing={1} alignItems="center">
            <Avatar sx={{ bgcolor: user.avatarColor ?? "secondary.main" }}>
              {user.name.charAt(0)}
            </Avatar>
          </Stack>
        </Stack>
      </Stack>
    </Paper>
  );
}
