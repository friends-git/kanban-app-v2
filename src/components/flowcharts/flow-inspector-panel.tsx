"use client";

import { Box, Stack, Typography } from "@mui/material";

type FlowInspectorPanelProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  emptyMessage?: string;
  children?: React.ReactNode;
};

export function FlowInspectorPanel({
  eyebrow,
  title,
  description,
  emptyMessage,
  children,
}: FlowInspectorPanelProps) {
  return (
    <Box
      sx={{
        p: 2.25,
        borderRadius: 6,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        minHeight: 220,
      }}
    >
      <Stack spacing={2}>
        <Stack spacing={0.65}>
          {eyebrow ? (
            <Typography
              variant="overline"
              sx={{ color: "secondary.main", letterSpacing: "0.14em" }}
            >
              {eyebrow}
            </Typography>
          ) : null}
          <Typography variant="h3">{title}</Typography>
          {description ? (
            <Typography color="text.secondary" variant="body2">
              {description}
            </Typography>
          ) : null}
        </Stack>

        {children ?? (
          <Typography color="text.secondary" variant="body2">
            {emptyMessage ?? "Selecione um item do canvas para ver mais contexto."}
          </Typography>
        )}
      </Stack>
    </Box>
  );
}
