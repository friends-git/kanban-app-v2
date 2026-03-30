"use client";

import { Box, Stack, Typography, alpha, useTheme } from "@mui/material";

type FlowCanvasShellProps = {
  title: string;
  description: string;
  actions?: React.ReactNode;
  toolbar?: React.ReactNode;
  sidebar?: React.ReactNode;
  inspector?: React.ReactNode;
  canvas: React.ReactNode;
  footer?: React.ReactNode;
};

export function FlowCanvasShell({
  title,
  description,
  actions,
  toolbar,
  sidebar,
  inspector,
  canvas,
  footer,
}: FlowCanvasShellProps) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        borderRadius: 7,
        overflow: "hidden",
        border: "1px solid",
        borderColor: "divider",
        bgcolor: alpha(theme.palette.background.paper, 0.76),
        boxShadow: "0 24px 60px rgba(7, 6, 12, 0.16)",
        backdropFilter: "blur(20px)",
      }}
    >
      <Box
        sx={{
          px: { xs: 2.25, md: 3 },
          py: 2.25,
          borderBottom: "1px solid",
          borderColor: "divider",
          background:
            "radial-gradient(circle at top left, rgba(93, 5, 255, 0.10), transparent 26%), radial-gradient(circle at bottom right, rgba(255, 187, 0, 0.10), transparent 22%)",
        }}
      >
        <Stack
          direction={{ xs: "column", xl: "row" }}
          justifyContent="space-between"
          spacing={2}
        >
          <Stack spacing={0.65} sx={{ maxWidth: 820 }}>
            <Typography variant="h3" sx={{ fontSize: { xs: "1.12rem", md: "1.2rem" } }}>
              {title}
            </Typography>
            <Typography color="text.secondary">{description}</Typography>
          </Stack>
          {actions ? (
            <Box
              sx={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: { xs: "flex-start", xl: "flex-end" },
              }}
            >
              {actions}
            </Box>
          ) : null}
        </Stack>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            lg: sidebar && inspector ? "280px minmax(0, 1fr) 320px" : sidebar ? "280px minmax(0, 1fr)" : inspector ? "minmax(0, 1fr) 320px" : "1fr",
          },
          minHeight: 680,
        }}
      >
        {sidebar ? (
          <Box
            sx={{
              borderRight: { xs: "none", lg: "1px solid" },
              borderBottom: { xs: "1px solid", lg: "none" },
              borderColor: "divider",
              p: 2,
              bgcolor: alpha(theme.palette.background.default, 0.22),
            }}
          >
            {sidebar}
          </Box>
        ) : null}

        <Box sx={{ position: "relative", minWidth: 0, minHeight: 680 }}>
          {toolbar ? (
            <Box
              sx={{
                position: "absolute",
                top: 18,
                left: 18,
                zIndex: 8,
              }}
            >
              {toolbar}
            </Box>
          ) : null}
          {canvas}
          {footer ? (
            <Box
              sx={{
                position: "absolute",
                left: 18,
                right: 18,
                bottom: 18,
                zIndex: 8,
              }}
            >
              {footer}
            </Box>
          ) : null}
        </Box>

        {inspector ? (
          <Box
            sx={{
              borderLeft: { xs: "none", lg: "1px solid" },
              borderTop: { xs: "1px solid", lg: "none" },
              borderColor: "divider",
              p: 2,
              bgcolor: alpha(theme.palette.background.default, 0.18),
            }}
          >
            {inspector}
          </Box>
        ) : null}
      </Box>
    </Box>
  );
}
