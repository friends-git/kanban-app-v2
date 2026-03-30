"use client";

import {
  AccountTreeRounded,
  CalendarMonthRounded,
  DashboardRounded,
  FolderRounded,
  GroupsRounded,
  SettingsRounded,
  TaskRounded,
  ViewKanbanRounded,
} from "@mui/icons-material";
import { alpha } from "@mui/material/styles";
import {
  Box,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Tooltip,
} from "@mui/material";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { adminNavigation, primaryNavigation } from "@/lib/navigation";

type SidebarNavProps = {
  showAdmin: boolean;
  mobile?: boolean;
  collapsed?: boolean;
};

const iconMap = {
  dashboard: DashboardRounded,
  projects: FolderRounded,
  flowcharts: AccountTreeRounded,
  tasks: TaskRounded,
  teams: GroupsRounded,
  sprints: ViewKanbanRounded,
  calendar: CalendarMonthRounded,
  admin: SettingsRounded,
} as const;

export function SidebarNav({
  showAdmin,
  mobile = false,
  collapsed = false,
}: SidebarNavProps) {
  const pathname = usePathname();
  const items = showAdmin
    ? [...primaryNavigation, adminNavigation]
    : [...primaryNavigation];

  if (mobile) {
    return (
      <Stack direction="row" spacing={1} sx={{ overflowX: "auto", pb: 0.5 }}>
        {items.map((item) => {
          const Icon = iconMap[item.key];
          const selected =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <ListItemButton
              key={item.href}
              component={Link}
              href={item.href}
              selected={selected}
              sx={(theme) => ({
                minWidth: 148,
                borderRadius: 4,
                border: "1px solid",
                borderColor: selected ? "secondary.main" : "divider",
                bgcolor: selected
                  ? alpha(theme.palette.secondary.main, theme.palette.mode === "dark" ? 0.16 : 0.08)
                  : "background.paper",
              })}
            >
              <ListItemIcon sx={{ minWidth: 34 }}>
                <Icon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          );
        })}
      </Stack>
    );
  }

  return (
    <Box>
      <List sx={{ p: 0 }}>
        {items.map((item) => {
          const Icon = iconMap[item.key];
          const selected =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          const button = (
            <ListItemButton
              key={item.href}
              component={Link}
              href={item.href}
              selected={selected}
              sx={(theme) => ({
                borderRadius: 4,
                mb: 0.75,
                px: collapsed ? 0 : 1.25,
                py: collapsed ? 0 : 1,
                minHeight: collapsed ? 56 : "auto",
                justifyContent: collapsed ? "center" : "flex-start",
                border: "1px solid transparent",
                color: selected ? "text.primary" : "text.secondary",
                bgcolor: selected
                  ? alpha(theme.palette.secondary.main, theme.palette.mode === "dark" ? 0.14 : 0.07)
                  : "transparent",
                borderColor: selected ? alpha(theme.palette.secondary.main, 0.28) : "transparent",
                boxShadow: selected && collapsed ? "0 14px 28px rgba(93, 5, 255, 0.14)" : "none",
              })}
            >
              <ListItemIcon
                sx={(theme) => ({
                  minWidth: collapsed ? "auto" : 38,
                  color: selected ? "secondary.main" : alpha(theme.palette.text.secondary, 0.82),
                  justifyContent: "center",
                })}
              >
                <Icon fontSize="small" />
              </ListItemIcon>
              {collapsed ? null : <ListItemText primary={item.label} />}
            </ListItemButton>
          );

          if (collapsed) {
            return (
              <Tooltip key={item.href} title={item.label} placement="right">
                <Box>{button}</Box>
              </Tooltip>
            );
          }

          return button;
        })}
      </List>
    </Box>
  );
}
