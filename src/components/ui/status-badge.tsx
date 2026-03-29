import { Chip } from "@mui/material";
import {
  projectStatusLabels,
  projectVisibilityLabels,
  roleLabels,
  sprintStatusLabels,
  taskStatusLabels,
  taskVisibilityLabels,
} from "@/lib/domain";

const labels = {
  ...projectStatusLabels,
  ...sprintStatusLabels,
  ...taskStatusLabels,
  ...projectVisibilityLabels,
  ...taskVisibilityLabels,
  ...roleLabels,
} as Record<string, string>;

const colors: Record<string, "default" | "success" | "warning" | "error" | "secondary"> = {
  ACTIVE: "success",
  COMPLETED: "default",
  PLANNING: "secondary",
  PLANNED: "secondary",
  AT_RISK: "warning",
  ON_HOLD: "default",
  BACKLOG: "default",
  TODO: "secondary",
  IN_PROGRESS: "warning",
  REVIEW: "secondary",
  DONE: "success",
  WORKSPACE: "secondary",
  PROJECT_MEMBERS: "default",
  LEADERS_ONLY: "warning",
  PROJECT: "default",
  ASSIGNEES: "warning",
  ADMIN: "secondary",
  MEMBER: "default",
  COLLABORATOR: "warning",
  ADVISOR: "default",
};

type StatusBadgeProps = {
  status: string;
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <Chip
      label={labels[status] ?? status}
      color={colors[status] ?? "default"}
      size="small"
      variant={status === "COMPLETED" || status === "DONE" ? "filled" : "outlined"}
    />
  );
}
