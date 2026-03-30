"use client";

import { AutoAwesomeRounded } from "@mui/icons-material";
import { Box, Button, Stack, Typography, alpha, useTheme } from "@mui/material";

type FlowEmptyStateProps = {
  title: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
};

export function FlowEmptyState({ title, message, action }: FlowEmptyStateProps) {
  const theme = useTheme();

  return (
    <Stack
      spacing={1.5}
      alignItems="center"
      justifyContent="center"
      sx={{
        minHeight: 300,
        px: 3,
        py: 7,
        borderRadius: 6,
        border: "1px dashed",
        borderColor: alpha(theme.palette.secondary.main, 0.22),
        bgcolor: alpha(theme.palette.background.paper, 0.5),
        textAlign: "center",
      }}
    >
      <Box
        sx={{
          width: 56,
          height: 56,
          borderRadius: 5,
          bgcolor: alpha(theme.palette.secondary.main, 0.14),
          color: "secondary.main",
          display: "grid",
          placeItems: "center",
        }}
      >
        <AutoAwesomeRounded />
      </Box>
      <Typography variant="h3">{title}</Typography>
      <Typography color="text.secondary" sx={{ maxWidth: 460 }}>
        {message}
      </Typography>
      {action ? (
        <Button onClick={action.onClick} variant="contained">
          {action.label}
        </Button>
      ) : null}
    </Stack>
  );
}
