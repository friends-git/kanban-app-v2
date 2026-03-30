"use client";

import { Box, Divider, IconButton, Stack, Tooltip, Typography, alpha, useTheme } from "@mui/material";

type FlowToolbarItem = {
  id: string;
  label: string;
  icon: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  shortcut?: string;
  onClick?: () => void;
};

type FlowToolbarGroup = {
  id: string;
  label: string;
  items: FlowToolbarItem[];
};

type FlowToolbarProps = {
  items?: FlowToolbarItem[];
  groups?: FlowToolbarGroup[];
  orientation?: "horizontal" | "vertical";
};

export function FlowToolbar({
  items,
  groups,
  orientation = "vertical",
}: FlowToolbarProps) {
  const theme = useTheme();
  const contentGroups =
    groups ??
    [
      {
        id: "default",
        label: "Ferramentas",
        items: items ?? [],
      },
    ];

  return (
    <Box
      sx={{
        p: 1.1,
        borderRadius: 5,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: alpha(theme.palette.background.paper, 0.86),
        backdropFilter: "blur(18px)",
        boxShadow: "0 18px 44px rgba(7, 6, 12, 0.18)",
        maxHeight: orientation === "vertical" ? "min(680px, calc(100vh - 240px))" : "none",
        overflowY: orientation === "vertical" ? "auto" : "visible",
        overscrollBehavior: "contain",
        pr: orientation === "vertical" ? 0.75 : 1.1,
        scrollbarWidth: "thin",
        "&::-webkit-scrollbar": {
          width: 8,
        },
        "&::-webkit-scrollbar-thumb": {
          borderRadius: 999,
          backgroundColor: alpha(theme.palette.text.secondary, 0.22),
        },
      }}
    >
      <Stack spacing={1.15}>
        {contentGroups.map((group, groupIndex) => (
          <Box key={group.id}>
            {groups ? (
              <Typography
                variant="caption"
                sx={{
                  display: "block",
                  mb: 0.85,
                  px: 0.4,
                  color: "text.secondary",
                  fontWeight: 800,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                }}
              >
                {group.label}
              </Typography>
            ) : null}

            <Stack direction={orientation === "horizontal" ? "row" : "column"} spacing={0.75}>
              {group.items.map((item) => (
                <Tooltip
                  key={item.id}
                  title={item.shortcut ? `${item.label} · ${item.shortcut}` : item.label}
                  placement={orientation === "horizontal" ? "bottom" : "right"}
                >
                  <Box>
                    <IconButton
                      onClick={item.onClick}
                      disabled={item.disabled}
                      sx={{
                        width: 56,
                        height: 56,
                        borderRadius: 4,
                        bgcolor: item.active
                          ? alpha(theme.palette.secondary.main, 0.16)
                          : "transparent",
                        color: item.active ? "secondary.main" : "text.secondary",
                        border: "1px solid",
                        borderColor: item.active
                          ? alpha(theme.palette.secondary.main, 0.28)
                          : "divider",
                        boxShadow: item.active
                          ? "0 14px 26px rgba(93, 5, 255, 0.16)"
                          : "none",
                        "&:hover": {
                          bgcolor: item.active
                            ? alpha(theme.palette.secondary.main, 0.22)
                            : alpha(theme.palette.text.secondary, 0.08),
                          color: item.active ? "secondary.main" : "text.primary",
                        },
                      }}
                    >
                      {item.icon}
                    </IconButton>
                    {orientation === "horizontal" ? (
                      <Typography
                        variant="caption"
                        sx={{
                          display: "block",
                          mt: 0.45,
                          textAlign: "center",
                          color: item.active ? "secondary.main" : "text.secondary",
                          fontWeight: 700,
                        }}
                      >
                        {item.label}
                      </Typography>
                    ) : null}
                  </Box>
                </Tooltip>
              ))}
            </Stack>

            {groups && groupIndex < contentGroups.length - 1 ? (
              <Divider sx={{ mt: 1.15, borderColor: alpha(theme.palette.divider, 0.8) }} />
            ) : null}
          </Box>
        ))}
      </Stack>
    </Box>
  );
}
